package fr.inria.autojmh.generators;

import fr.inria.autojmh.snippets.modelattrib.TypeAttributes;

/**
 * Created by marodrig on 20/11/2015.
 */
public class StreamType {
    /**
     * Name of the Type
     */
    String name;
    /**
     * Name of the method used to store this type
     */
    String method;

    /**
     * Name of the equivalent class for the primitive type.
     */
    String primitiveClassName;

    /**
     * Attributes of the type being streamed
     */
    TypeAttributes attributes;

    /**
     * If this type is a collection then metadata regarding the collection is needed
     */
    CollectionType collectionType;

    public StreamType(String name, String method, String primitiveClassName) {
        this.name = name;
        this.method = method;
        this.primitiveClassName = primitiveClassName;
    }

    public StreamType(String name, String method, TypeAttributes typeAttributes) {
        this.name = name;
        this.method = method;
        this.attributes = typeAttributes;
    }

    public String getName() {
        return name;
    }

    public String getMethod() {
        return method;
    }

    public String getPrimitiveClassName() {
        return primitiveClassName;
    }

    public TypeAttributes getAttributes() {
        return attributes;
    }

    public void setAttributes(TypeAttributes attributes) {
        this.attributes = attributes;
    }

}
#DEFINE XEC_PEER_COMMON_H
