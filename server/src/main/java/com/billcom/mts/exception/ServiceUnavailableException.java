package com.billcom.mts.exception;

/**
 * Exception levee lorsqu'un service technique requis est indisponible.
 */
public class ServiceUnavailableException extends RuntimeException {

    public ServiceUnavailableException(String message) {
        super(message);
    }

    public ServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
