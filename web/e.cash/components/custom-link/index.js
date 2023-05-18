import Link from 'next/link';

export const CustomLink = ({ href, children }) => {
    return href.startsWith('https') ? (
        <Link href={href} target="_blank" rel="noreferrer">
            {children}
        </Link>
    ) : (
        <Link href={href}>{children}</Link>
    );
};

export default CustomLink;
