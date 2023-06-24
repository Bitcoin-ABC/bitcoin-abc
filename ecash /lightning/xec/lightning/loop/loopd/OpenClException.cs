using System;

namespace OpenCl
{
    public class OpenClException : System.Exception
    {
        private ErrorCode code;

        public OpenClException(ErrorCode code)
            : base(String.Format("OpenCl error {0}: {1}.", (int)code, code.ToString()))
        {
            this.code = code;
        }

        public OpenClException(ErrorCode error, string message)
            : base(message)
        {
            this.code = error;
        }

        public OpenClException(ErrorCode error, string message, Exception inner)
            : base(message, inner)
        {
            this.code = error;
        }

        public ErrorCode ErrorCode
        {
            get { return this.code; }
        }
    }
}
