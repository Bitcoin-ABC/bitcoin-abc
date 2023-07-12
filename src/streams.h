// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_STREAMS_H
#define BITCOIN_STREAMS_H

#include <serialize.h>
#include <span.h>
#include <support/allocators/zeroafterfree.h>

#include <algorithm>
#include <cassert>
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <ios>
#include <limits>
#include <optional>
#include <string>
#include <utility>
#include <vector>

template <typename Stream> class OverrideStream {
    Stream *stream;

    const int nType;
    const int nVersion;

public:
    OverrideStream(Stream *stream_, int nType_, int nVersion_)
        : stream(stream_), nType(nType_), nVersion(nVersion_) {}

    template <typename T> OverrideStream<Stream> &operator<<(const T &obj) {
        // Serialize to this stream
        ::Serialize(*this, obj);
        return (*this);
    }

    template <typename T> OverrideStream<Stream> &operator>>(T &&obj) {
        // Unserialize from this stream
        ::Unserialize(*this, obj);
        return (*this);
    }

    void write(Span<const std::byte> src) { stream->write(src); }

    void read(Span<std::byte> dst) { stream->read(dst); }

    int GetVersion() const { return nVersion; }
    int GetType() const { return nType; }
    void ignore(size_t size) { return stream->ignore(size); }
};

template <typename S> OverrideStream<S> WithOrVersion(S *s, int nVersionFlag) {
    return OverrideStream<S>(s, s->GetType(), s->GetVersion() | nVersionFlag);
}

/**
 * Minimal stream for overwriting and/or appending to an existing byte vector.
 *
 * The referenced vector will grow as necessary.
 */
class CVectorWriter {
public:
    /**
     * @param[in]  nTypeIn Serialization Type
     * @param[in]  nVersionIn Serialization Version (including any flags)
     * @param[in]  vchDataIn  Referenced byte vector to overwrite/append
     * @param[in]  nPosIn Starting position. Vector index where writes should
     * start. The vector will initially grow as necessary to  max(nPosIn,
     * vec.size()). So to append, use vec.size().
     */
    CVectorWriter(int nTypeIn, int nVersionIn, std::vector<uint8_t> &vchDataIn,
                  size_t nPosIn)
        : nType(nTypeIn), nVersion(nVersionIn), vchData(vchDataIn),
          nPos(nPosIn) {
        if (nPos > vchData.size()) {
            vchData.resize(nPos);
        }
    }
    /**
     * (other params same as above)
     * @param[in]  args  A list of items to serialize starting at nPosIn.
     */
    template <typename... Args>
    CVectorWriter(int nTypeIn, int nVersionIn, std::vector<uint8_t> &vchDataIn,
                  size_t nPosIn, Args &&...args)
        : CVectorWriter(nTypeIn, nVersionIn, vchDataIn, nPosIn) {
        ::SerializeMany(*this, std::forward<Args>(args)...);
    }
    void write(Span<const std::byte> src) {
        assert(nPos <= vchData.size());
        size_t nOverwrite = std::min(src.size(), vchData.size() - nPos);
        if (nOverwrite) {
            memcpy(vchData.data() + nPos, src.data(), nOverwrite);
        }
        if (nOverwrite < src.size()) {
            vchData.insert(vchData.end(), UCharCast(src.data()) + nOverwrite,
                           UCharCast(src.end()));
        }
        nPos += src.size();
    }
    template <typename T> CVectorWriter &operator<<(const T &obj) {
        // Serialize to this stream
        ::Serialize(*this, obj);
        return (*this);
    }
    int GetVersion() const { return nVersion; }
    int GetType() const { return nType; }
    void seek(size_t nSize) {
        nPos += nSize;
        if (nPos > vchData.size()) {
            vchData.resize(nPos);
        }
    }

private:
    const int nType;
    const int nVersion;
    std::vector<uint8_t> &vchData;
    size_t nPos;
};

/**
 * Minimal stream for reading from an existing byte array by Span.
 */
class SpanReader {
private:
    const int m_type;
    const int m_version;
    Span<const uint8_t> m_data;

public:
    /**
     * @param[in]  type Serialization Type
     * @param[in]  version Serialization Version (including any flags)
     * @param[in]  data Referenced byte vector to overwrite/append
     */
    SpanReader(int type, int version, Span<const uint8_t> data)
        : m_type(type), m_version(version), m_data(data) {}

    template <typename T> SpanReader &operator>>(T &obj) {
        // Unserialize from this stream
        ::Unserialize(*this, obj);
        return (*this);
    }

    int GetVersion() const { return m_version; }
    int GetType() const { return m_type; }

    size_t size() const { return m_data.size(); }
    bool empty() const { return m_data.empty(); }

    void read(Span<std::byte> dst) {
        if (dst.size() == 0) {
            return;
        }

        // Read from the beginning of the buffer
        if (dst.size() > m_data.size()) {
            throw std::ios_base::failure("SpanReader::read(): end of data");
        }
        memcpy(dst.data(), m_data.data(), dst.size());
        m_data = m_data.subspan(dst.size());
    }
};

/**
 * Double ended buffer combining vector and stream-like interfaces.
 *
 * >> and << read and write unformatted data using the above serialization
 * templates. Fills with data in linear time; some stringstream implementations
 * take N^2 time.
 */
class DataStream {
protected:
    using vector_type = SerializeData;
    vector_type vch;
    unsigned int nReadPos{0};

public:
    typedef vector_type::allocator_type allocator_type;
    typedef vector_type::size_type size_type;
    typedef vector_type::difference_type difference_type;
    typedef vector_type::reference reference;
    typedef vector_type::const_reference const_reference;
    typedef vector_type::value_type value_type;
    typedef vector_type::iterator iterator;
    typedef vector_type::const_iterator const_iterator;
    typedef vector_type::reverse_iterator reverse_iterator;

    explicit DataStream() {}
    explicit DataStream(Span<const uint8_t> sp) : DataStream{AsBytes(sp)} {}
    explicit DataStream(Span<const value_type> sp)
        : vch(sp.data(), sp.data() + sp.size()) {}

    std::string str() const {
        return std::string{UCharCast(data()), UCharCast(data() + size())};
    }

    //
    // Vector subset
    //
    const_iterator begin() const { return vch.begin() + nReadPos; }
    iterator begin() { return vch.begin() + nReadPos; }
    const_iterator end() const { return vch.end(); }
    iterator end() { return vch.end(); }
    size_type size() const { return vch.size() - nReadPos; }
    bool empty() const { return vch.size() == nReadPos; }
    void resize(size_type n, value_type c = value_type{}) {
        vch.resize(n + nReadPos, c);
    }
    void reserve(size_type n) { vch.reserve(n + nReadPos); }
    const_reference operator[](size_type pos) const {
        return vch[pos + nReadPos];
    }
    reference operator[](size_type pos) { return vch[pos + nReadPos]; }
    void clear() {
        vch.clear();
        nReadPos = 0;
    }
    value_type *data() { return vch.data() + nReadPos; }
    const value_type *data() const { return vch.data() + nReadPos; }

    void insert(iterator it, std::vector<value_type>::const_iterator first,
                std::vector<value_type>::const_iterator last) {
        if (last == first) {
            return;
        }

        assert(last - first > 0);
        if (it == vch.begin() + nReadPos &&
            (unsigned int)(last - first) <= nReadPos) {
            // special case for inserting at the front when there's room
            nReadPos -= (last - first);
            memcpy(&vch[nReadPos], &first[0], last - first);
        } else {
            vch.insert(it, first, last);
        }
    }

    // This was added to have full compat with the std::vector interface but is
    // unused (except in a Bitcoin ABC specific test in stream_tests)
    void insert(iterator it, const value_type *first, const value_type *last) {
        if (last == first) {
            return;
        }

        assert(last - first > 0);
        if (it == vch.begin() + nReadPos &&
            (unsigned int)(last - first) <= nReadPos) {
            // special case for inserting at the front when there's room
            nReadPos -= (last - first);
            memcpy(&vch[nReadPos], &first[0], last - first);
        } else {
            vch.insert(it, first, last);
        }
    }

    iterator erase(iterator it) {
        if (it == vch.begin() + nReadPos) {
            // special case for erasing from the front
            if (++nReadPos >= vch.size()) {
                // whenever we reach the end, we take the opportunity to clear
                // the buffer
                nReadPos = 0;
                return vch.erase(vch.begin(), vch.end());
            }
            return vch.begin() + nReadPos;
        } else {
            return vch.erase(it);
        }
    }

    iterator erase(iterator first, iterator last) {
        if (first == vch.begin() + nReadPos) {
            // special case for erasing from the front
            if (last == vch.end()) {
                nReadPos = 0;
                return vch.erase(vch.begin(), vch.end());
            } else {
                nReadPos = (last - vch.begin());
                return last;
            }
        } else
            return vch.erase(first, last);
    }

    inline void Compact() {
        vch.erase(vch.begin(), vch.begin() + nReadPos);
        nReadPos = 0;
    }

    bool Rewind(std::optional<size_type> n = std::nullopt) {
        // Total rewind if no size is passed
        if (!n) {
            nReadPos = 0;
            return true;
        }
        // Rewind by n characters if the buffer hasn't been compacted yet
        if (*n > nReadPos) {
            return false;
        }
        nReadPos -= *n;
        return true;
    }

    //
    // Stream subset
    //
    bool eof() const { return size() == 0; }
    int in_avail() const { return size(); }

    void read(Span<value_type> dst) {
        if (dst.size() == 0) {
            return;
        }

        // Read from the beginning of the buffer
        unsigned int nReadPosNext = nReadPos + dst.size();
        if (nReadPosNext > vch.size()) {
            throw std::ios_base::failure("DataStream::read(): end of data");
        }
        memcpy(dst.data(), &vch[nReadPos], dst.size());
        if (nReadPosNext == vch.size()) {
            nReadPos = 0;
            vch.clear();
            return;
        }
        nReadPos = nReadPosNext;
    }

    void ignore(int nSize) {
        // Ignore from the beginning of the buffer
        if (nSize < 0) {
            throw std::ios_base::failure(
                "DataStream::ignore(): nSize negative");
        }
        unsigned int nReadPosNext = nReadPos + nSize;
        if (nReadPosNext >= vch.size()) {
            if (nReadPosNext > vch.size()) {
                throw std::ios_base::failure(
                    "DataStream::ignore(): end of data");
            }
            nReadPos = 0;
            vch.clear();
            return;
        }
        nReadPos = nReadPosNext;
    }

    void write(Span<const value_type> src) {
        // Write to the end of the buffer
        vch.insert(vch.end(), src.begin(), src.end());
    }

    template <typename Stream> void Serialize(Stream &s) const {
        // Special case: stream << stream concatenates like stream += stream
        if (!vch.empty()) {
            s.write(MakeByteSpan(vch));
        }
    }

    template <typename T> DataStream &operator<<(const T &obj) {
        // Serialize to this stream
        ::Serialize(*this, obj);
        return (*this);
    }

    template <typename T> DataStream &operator>>(T &&obj) {
        // Unserialize from this stream
        ::Unserialize(*this, obj);
        return (*this);
    }

    /**
     * XOR the contents of this stream with a certain key.
     *
     * @param[in] key    The key used to XOR the data in this stream.
     */
    void Xor(const std::vector<uint8_t> &key) {
        if (key.size() == 0) {
            return;
        }

        for (size_type i = 0, j = 0; i != size(); i++) {
            vch[i] ^= std::byte{key[j++]};

            // This potentially acts on very many bytes of data, so it's
            // important that we calculate `j`, i.e. the `key` index in this way
            // instead of doing a %, which would effectively be a division for
            // each byte Xor'd -- much slower than need be.
            if (j == key.size()) j = 0;
        }
    }
};

class CDataStream : public DataStream {
private:
    int nType;
    int nVersion;

public:
    explicit CDataStream(int nTypeIn, int nVersionIn)
        : nType{nTypeIn}, nVersion{nVersionIn} {}

    explicit CDataStream(Span<const uint8_t> sp, int type, int version)
        : CDataStream{AsBytes(sp), type, version} {}
    explicit CDataStream(Span<const value_type> sp, int nTypeIn, int nVersionIn)
        : DataStream{sp}, nType{nTypeIn}, nVersion{nVersionIn} {}

    int GetType() const { return nType; }
    void SetVersion(int n) { nVersion = n; }
    int GetVersion() const { return nVersion; }

    template <typename T> CDataStream &operator<<(const T &obj) {
        ::Serialize(*this, obj);
        return *this;
    }

    template <typename T> CDataStream &operator>>(T &&obj) {
        ::Unserialize(*this, obj);
        return *this;
    }
};

template <typename IStream> class BitStreamReader {
private:
    IStream &m_istream;

    /// Buffered byte read in from the input stream. A new byte is read into the
    /// buffer when m_offset reaches 8.
    uint8_t m_buffer{0};

    /// Number of high order bits in m_buffer already returned by previous
    /// Read() calls. The next bit to be returned is at this offset from the
    /// most significant bit position.
    int m_offset{8};

public:
    explicit BitStreamReader(IStream &istream) : m_istream(istream) {}

    /**
     * Read the specified number of bits from the stream. The data is returned
     * in the nbits least significant bits of a 64-bit uint.
     */
    uint64_t Read(int nbits) {
        if (nbits < 0 || nbits > 64) {
            throw std::out_of_range("nbits must be between 0 and 64");
        }

        uint64_t data = 0;
        while (nbits > 0) {
            if (m_offset == 8) {
                m_istream >> m_buffer;
                m_offset = 0;
            }

            int bits = std::min(8 - m_offset, nbits);
            data <<= bits;
            data |= static_cast<uint8_t>(m_buffer << m_offset) >> (8 - bits);
            m_offset += bits;
            nbits -= bits;
        }
        return data;
    }
};

template <typename OStream> class BitStreamWriter {
private:
    OStream &m_ostream;

    /// Buffered byte waiting to be written to the output stream. The byte is
    /// written buffer when m_offset reaches 8 or Flush() is called.
    uint8_t m_buffer{0};

    /// Number of high order bits in m_buffer already written by previous
    /// Write() calls and not yet flushed to the stream. The next bit to be
    /// written to is at this offset from the most significant bit position.
    int m_offset{0};

public:
    explicit BitStreamWriter(OStream &ostream) : m_ostream(ostream) {}

    ~BitStreamWriter() { Flush(); }

    /**
     * Write the nbits least significant bits of a 64-bit int to the output
     * stream. Data is buffered until it completes an octet.
     */
    void Write(uint64_t data, int nbits) {
        if (nbits < 0 || nbits > 64) {
            throw std::out_of_range("nbits must be between 0 and 64");
        }

        while (nbits > 0) {
            int bits = std::min(8 - m_offset, nbits);
            m_buffer |= (data << (64 - nbits)) >> (64 - 8 + m_offset);
            m_offset += bits;
            nbits -= bits;

            if (m_offset == 8) {
                Flush();
            }
        }
    }

    /**
     * Flush any unwritten bits to the output stream, padding with 0's to the
     * next byte boundary.
     */
    void Flush() {
        if (m_offset == 0) {
            return;
        }

        m_ostream << m_buffer;
        m_buffer = 0;
        m_offset = 0;
    }
};

/**
 * Non-refcounted RAII wrapper for FILE*
 *
 * Will automatically close the file when it goes out of scope if not null. If
 * you're returning the file pointer, return file.release(). If you need to
 * close the file early, use file.fclose() instead of fclose(file).
 */
class AutoFile {
protected:
    FILE *file;

public:
    explicit AutoFile(FILE *filenew) : file{filenew} {}

    ~AutoFile() { fclose(); }

    // Disallow copies
    AutoFile(const AutoFile &) = delete;
    AutoFile &operator=(const AutoFile &) = delete;

    int fclose() {
        int retval{0};
        if (file) {
            retval = ::fclose(file);
            file = nullptr;
        }
        return retval;
    }

    /**
     * Get wrapped FILE* with transfer of ownership.
     * @note This will invalidate the AutoFile object, and makes it the
     * responsibility of the caller of this function to clean up the returned
     * FILE*.
     */
    FILE *release() {
        FILE *ret = file;
        file = nullptr;
        return ret;
    }

    /**
     * Get wrapped FILE* without transfer of ownership.
     * @note Ownership of the FILE* will remain with this class. Use this only
     * if the scope of the AutoFile outlives use of the passed pointer.
     */
    FILE *Get() const { return file; }

    /** Return true if the wrapped FILE* is nullptr, false otherwise. */
    bool IsNull() const { return (file == nullptr); }

    //
    // Stream subset
    //
    void read(Span<std::byte> dst) {
        if (!file) {
            throw std::ios_base::failure(
                "AutoFile::read: file handle is nullptr");
        }
        if (fread(dst.data(), 1, dst.size(), file) != dst.size()) {
            throw std::ios_base::failure(feof(file)
                                             ? "AutoFile::read: end of file"
                                             : "AutoFile::read: fread failed");
        }
    }

    void ignore(size_t nSize) {
        if (!file) {
            throw std::ios_base::failure(
                "AutoFile::ignore: file handle is nullptr");
        }
        uint8_t data[4096];
        while (nSize > 0) {
            size_t nNow = std::min<size_t>(nSize, sizeof(data));
            if (fread(data, 1, nNow, file) != nNow) {
                throw std::ios_base::failure(
                    feof(file) ? "AutoFile::ignore: end of file"
                               : "AutoFile::read: fread failed");
            }
            nSize -= nNow;
        }
    }

    void write(Span<const std::byte> src) {
        if (!file) {
            throw std::ios_base::failure(
                "AutoFile::write: file handle is nullptr");
        }
        if (fwrite(src.data(), 1, src.size(), file) != src.size()) {
            throw std::ios_base::failure("AutoFile::write: write failed");
        }
    }

    template <typename T> AutoFile &operator<<(const T &obj) {
        ::Serialize(*this, obj);
        return *this;
    }

    template <typename T> AutoFile &operator>>(T &&obj) {
        ::Unserialize(*this, obj);
        return *this;
    }
};

class CAutoFile : public AutoFile {
private:
    const int nType;
    const int nVersion;

public:
    CAutoFile(FILE *filenew, int nTypeIn, int nVersionIn)
        : AutoFile{filenew}, nType(nTypeIn), nVersion(nVersionIn) {}
    int GetType() const { return nType; }
    int GetVersion() const { return nVersion; }

    template <typename T> CAutoFile &operator<<(const T &obj) {
        ::Serialize(*this, obj);
        return (*this);
    }

    template <typename T> CAutoFile &operator>>(T &&obj) {
        ::Unserialize(*this, obj);
        return (*this);
    }
};

/**
 * Non-refcounted RAII wrapper around a FILE* that implements a ring buffer to
 * deserialize from. It guarantees the ability to rewind a given number of
 * bytes.
 *
 * Will automatically close the file when it goes out of scope if not null. If
 * you need to close the file early, use file.fclose() instead of fclose(file).
 */
class CBufferedFile {
private:
    const int nType;
    const int nVersion;

    //! source file
    FILE *src;
    //! how many bytes have been read from source
    uint64_t nSrcPos;
    //! how many bytes have been read from this
    uint64_t nReadPos;
    //! up to which position we're allowed to read
    uint64_t nReadLimit;
    //! how many bytes we guarantee to rewind
    uint64_t nRewind;
    //! the buffer
    std::vector<std::byte> vchBuf;

    //! read data from the source to fill the buffer
    bool Fill() {
        unsigned int pos = nSrcPos % vchBuf.size();
        unsigned int readNow = vchBuf.size() - pos;
        unsigned int nAvail = vchBuf.size() - (nSrcPos - nReadPos) - nRewind;
        if (nAvail < readNow) {
            readNow = nAvail;
        }
        if (readNow == 0) {
            return false;
        }
        size_t nBytes = fread((void *)&vchBuf[pos], 1, readNow, src);
        if (nBytes == 0) {
            throw std::ios_base::failure(
                feof(src) ? "CBufferedFile::Fill: end of file"
                          : "CBufferedFile::Fill: fread failed");
        }
        nSrcPos += nBytes;
        return true;
    }

    //! Advance the stream's read pointer (m_read_pos) by up to 'length' bytes,
    //! filling the buffer from the file so that at least one byte is available.
    //! Return a pointer to the available buffer data and the number of bytes
    //! (which may be less than the requested length) that may be accessed
    //! beginning at that pointer.
    std::pair<std::byte *, size_t> AdvanceStream(size_t length) {
        assert(nReadPos <= nSrcPos);
        if (nReadPos + length > nReadLimit) {
            throw std::ios_base::failure(
                "Attempt to position past buffer limit");
        }
        // If there are no bytes available, read from the file.
        if (nReadPos == nSrcPos && length > 0) {
            Fill();
        }

        size_t buffer_offset{static_cast<size_t>(nReadPos % vchBuf.size())};
        size_t buffer_available{
            static_cast<size_t>(vchBuf.size() - buffer_offset)};
        size_t bytes_until_source_pos{static_cast<size_t>(nSrcPos - nReadPos)};
        size_t advance{
            std::min({length, buffer_available, bytes_until_source_pos})};
        nReadPos += advance;
        return std::make_pair(&vchBuf[buffer_offset], advance);
    }

public:
    CBufferedFile(FILE *fileIn, uint64_t nBufSize, uint64_t nRewindIn,
                  int nTypeIn, int nVersionIn)
        : nType(nTypeIn), nVersion(nVersionIn), nSrcPos(0), nReadPos(0),
          nReadLimit(std::numeric_limits<uint64_t>::max()), nRewind(nRewindIn),
          vchBuf(nBufSize, std::byte{0}) {
        if (nRewindIn >= nBufSize) {
            throw std::ios_base::failure(
                "Rewind limit must be less than buffer size");
        }
        src = fileIn;
    }

    ~CBufferedFile() { fclose(); }

    // Disallow copies
    CBufferedFile(const CBufferedFile &) = delete;
    CBufferedFile &operator=(const CBufferedFile &) = delete;

    int GetVersion() const { return nVersion; }
    int GetType() const { return nType; }

    void fclose() {
        if (src) {
            ::fclose(src);
            src = nullptr;
        }
    }

    //! check whether we're at the end of the source file
    bool eof() const { return nReadPos == nSrcPos && feof(src); }

    //! read a number of bytes
    void read(Span<std::byte> dst) {
        while (dst.size() > 0) {
            auto [buffer_pointer, length]{AdvanceStream(dst.size())};
            memcpy(dst.data(), buffer_pointer, length);
            dst = dst.subspan(length);
        }
    }

    //! Move the read position ahead in the stream to the given position.
    //! Use SetPos() to back up in the stream, not SkipTo().
    void SkipTo(const uint64_t file_pos) {
        assert(file_pos >= nReadPos);
        while (nReadPos < file_pos) {
            AdvanceStream(file_pos - nReadPos);
        }
    }

    //! return the current reading position
    uint64_t GetPos() const { return nReadPos; }

    //! rewind to a given reading position
    bool SetPos(uint64_t nPos) {
        size_t bufsize = vchBuf.size();
        if (nPos + bufsize < nSrcPos) {
            // rewinding too far, rewind as far as possible
            nReadPos = nSrcPos - bufsize;
            return false;
        }
        if (nPos > nSrcPos) {
            // can't go this far forward, go as far as possible
            nReadPos = nSrcPos;
            return false;
        }
        nReadPos = nPos;
        return true;
    }

    //! Prevent reading beyond a certain position. No argument removes the
    //! limit.
    bool SetLimit(uint64_t nPos = std::numeric_limits<uint64_t>::max()) {
        if (nPos < nReadPos) {
            return false;
        }
        nReadLimit = nPos;
        return true;
    }

    template <typename T> CBufferedFile &operator>>(T &&obj) {
        // Unserialize from this stream
        ::Unserialize(*this, obj);
        return (*this);
    }

    //! search for a given byte in the stream, and remain positioned on it
    void FindByte(std::byte byte) {
        // For best performance, avoid mod operation within the loop.
        size_t buf_offset{size_t(nReadPos % uint64_t(vchBuf.size()))};
        while (true) {
            if (nReadPos == nSrcPos) {
                // No more bytes available; read from the file into the buffer,
                // setting nSrcPos to one beyond the end of the new data.
                // Throws exception if end-of-file reached.
                Fill();
            }
            const size_t len{std::min<size_t>(vchBuf.size() - buf_offset,
                                              nSrcPos - nReadPos)};
            const auto it_start{vchBuf.begin() + buf_offset};
            const auto it_find{std::find(it_start, it_start + len, byte)};
            const size_t inc{size_t(std::distance(it_start, it_find))};
            nReadPos += inc;
            if (inc < len) {
                break;
            }
            buf_offset += inc;
            if (buf_offset >= vchBuf.size()) {
                buf_offset = 0;
            }
        }
    }
};

#endif // BITCOIN_STREAMS_H
