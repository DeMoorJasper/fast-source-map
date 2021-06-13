use std::io;

// Errors that can occur during processing/modifying source map
#[derive(Copy, Clone, Debug)]
#[repr(u32)]
pub enum SourceMapErrorType {
    // NB: 0 is reserved for OK.
    // The mappings contained a negative line, column, source index, or name index.
    UnexpectedNegativeNumber = 1,

    // The mappings contained a number larger than `u32::MAX`.
    UnexpectedlyBigNumber = 2,

    // Reached EOF while in the middle of parsing a VLQ.
    VlqUnexpectedEof = 3,

    // Encountered an invalid base 64 character while parsing a VLQ.
    VlqInvalidBase64 = 4,

    // VLQ encountered a number that, when decoded, would not fit in a u32.
    VlqOverflow = 5,

    // General IO Error
    IOError = 6,

    // Name out of range
    NameOutOfRange = 7,

    // Source out of range
    SourceOutOfRange = 8,

    // Failed to write buffer
    BufferError = 9,

    // FilePath is invalid
    InvalidFilePath = 10,

    // Failed to convert utf-8 to array
    FromUtf8Error = 11,

    // Failed to serialize to JSON
    JSONSerializeError = 12,
}

pub struct SourceMapError {
    pub error_type: SourceMapErrorType,
    pub reason: Option<String>,
}

impl SourceMapError {
    pub fn new(error_type: SourceMapErrorType) -> Self {
        Self {
            error_type,
            reason: None,
        }
    }

    pub fn new_with_reason(error_type: SourceMapErrorType, reason: &str) -> Self {
        Self {
            error_type,
            reason: Some(String::from(reason)),
        }
    }
}

impl From<vlq::Error> for SourceMapError {
    #[inline]
    fn from(e: vlq::Error) -> SourceMapError {
        match e {
            vlq::Error::UnexpectedEof => SourceMapError::new(SourceMapErrorType::VlqUnexpectedEof),
            vlq::Error::InvalidBase64(_) => {
                SourceMapError::new(SourceMapErrorType::VlqInvalidBase64)
            }
            vlq::Error::Overflow => SourceMapError::new(SourceMapErrorType::VlqOverflow),
        }
    }
}

impl From<io::Error> for SourceMapError {
    #[inline]
    fn from(_err: io::Error) -> SourceMapError {
        SourceMapError::new(SourceMapErrorType::IOError)
    }
}

impl From<SourceMapError> for napi::Error {
    #[inline]
    fn from(err: SourceMapError) -> napi::Error {
        // Prefix all errors, so it's obvious they originate from this library
        let mut reason = String::from("[parcel-sourcemap] ");

        // Convert error type into an error message...
        match err.error_type {
            SourceMapErrorType::UnexpectedNegativeNumber => {
                reason.push_str("Unexpected Negative Number");
            }
            SourceMapErrorType::UnexpectedlyBigNumber => {
                reason.push_str("Unexpected Big Number");
            }
            SourceMapErrorType::VlqUnexpectedEof => {
                reason.push_str("VLQ Unexpected end of file");
            }
            SourceMapErrorType::VlqInvalidBase64 => {
                reason.push_str("VLQ Invalid Base 64 value");
            }
            SourceMapErrorType::VlqOverflow => {
                reason.push_str("VLQ Value overflowed, does not fit in u32");
            }
            SourceMapErrorType::IOError => {
                reason.push_str("IO Error");
            }
            SourceMapErrorType::NameOutOfRange => {
                reason.push_str("Name out of range");
            }
            SourceMapErrorType::SourceOutOfRange => {
                reason.push_str("Source out of range");
            }
            SourceMapErrorType::InvalidFilePath => {
                reason.push_str("Invalid FilePath");
            }
            SourceMapErrorType::BufferError => {
                reason.push_str("Something went wrong while writing/reading a sourcemap buffer");
            }
            SourceMapErrorType::FromUtf8Error => {
                reason.push_str("Could not convert utf-8 array to string");
            }
            SourceMapErrorType::JSONSerializeError => {
                reason.push_str("Error serializing to JSON");
            }
        }

        // Add reason to error string if there is one

        if let Some(r) = err.reason {
            reason.push_str(", ");
            reason.push_str(&r[..]);
        }

        // Return a napi error :)
        napi::Error::new(napi::Status::GenericFailure, reason)
    }
}

impl From<SourceMapError> for wasm_bindgen::JsValue {
    #[inline]
    fn from(err: SourceMapError) -> wasm_bindgen::JsValue {
        // Prefix all errors, so it's obvious they originate from this library
        let mut reason = String::from("[parcel-sourcemap] ");

        // Convert error type into an error message...
        match err.error_type {
            SourceMapErrorType::UnexpectedNegativeNumber => {
                reason.push_str("Unexpected Negative Number");
            }
            SourceMapErrorType::UnexpectedlyBigNumber => {
                reason.push_str("Unexpected Big Number");
            }
            SourceMapErrorType::VlqUnexpectedEof => {
                reason.push_str("VLQ Unexpected end of file");
            }
            SourceMapErrorType::VlqInvalidBase64 => {
                reason.push_str("VLQ Invalid Base 64 value");
            }
            SourceMapErrorType::VlqOverflow => {
                reason.push_str("VLQ Value overflowed, does not fit in u32");
            }
            SourceMapErrorType::IOError => {
                reason.push_str("IO Error");
            }
            SourceMapErrorType::NameOutOfRange => {
                reason.push_str("Name out of range");
            }
            SourceMapErrorType::SourceOutOfRange => {
                reason.push_str("Source out of range");
            }
            SourceMapErrorType::InvalidFilePath => {
                reason.push_str("Invalid FilePath");
            }
            SourceMapErrorType::BufferError => {
                reason.push_str("Something went wrong while writing/reading a sourcemap buffer");
            }
            SourceMapErrorType::FromUtf8Error => {
                reason.push_str("Could not convert utf-8 array to string");
            }
            SourceMapErrorType::JSONSerializeError => {
                reason.push_str("Error serializing to JSON");
            }
        }

        // Add reason to error string if there is one
        if let Some(r) = err.reason {
            reason.push_str(", ");
            reason.push_str(&r[..]);
        }

        // Return a JavaScript error :)
        js_sys::Error::new(&reason).into()
    }
}

impl From<rkyv::Unreachable> for SourceMapError {
    #[inline]
    fn from(_err: rkyv::Unreachable) -> SourceMapError {
        SourceMapError::new(SourceMapErrorType::BufferError)
    }
}

impl From<std::string::FromUtf8Error> for SourceMapError {
    #[inline]
    fn from(_err: std::string::FromUtf8Error) -> SourceMapError {
        SourceMapError::new(SourceMapErrorType::FromUtf8Error)
    }
}

impl From<serde_json::Error> for SourceMapError {
    #[inline]
    fn from(_err: serde_json::Error) -> SourceMapError {
        SourceMapError::new(SourceMapErrorType::JSONSerializeError)
    }
}
