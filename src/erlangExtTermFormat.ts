import { Buffer } from "buffer";
import { randomUUID } from "crypto";

enum Tag {
    NewFloatExt = 70,
    SmallIntegerExt = 97,
    IntegerExt = 98,
    NilExt = 106,
    SmallTupleExt = 104,
    LargeTupleExt = 105,
    StringExt = 107,
    ListExt = 108,
    ExportExt = 113,
    AtomUtf8Ext = 118,
    SmallAtomUtf8Ext = 119,
    Version = 131,
}

type ErlangType = "atom" | "integer" | "float" | "string" | "tuple" | "list" | "export";
type ErlangContent = string | number | Term[] | [string, string, number];

type ErlangDataType<T extends ErlangType, C extends ErlangContent> = {
    type: T,
    content: C,
    toString(): string;
};

export type Atom = ErlangDataType<"atom", string>;
export type Integer = ErlangDataType<"integer", number>;
export type Float = ErlangDataType<"float", number>;
export type String = ErlangDataType<"string", string>;
export type Tuple<T extends Term[]> = ErlangDataType<"tuple", T>;
export type List<T extends Term[]> = ErlangDataType<"list", T>;
export type Export = ErlangDataType<"export", [string, string, number]>;
export type Term = Atom | Integer | Float | String | Tuple<Term[]> | List<Term[]> | Export;

export type ErlangRequest = Tuple<[String, Export, List<Term[]>]> & { ref: () => string };

export type ErlangResponse = Tuple<[String, Term]>;

export function encode(data: Term) {
    const buffer = encodeErlangData(data, [Tag.Version]);
    return Buffer.from(buffer);
}

function encodeErlangData(data: Term, buffer: number[] = []): number[] {
    switch (data.type) {
        case "atom":
            return encodeAtom(data.content, buffer);
        case "integer":
            return encodeInteger(data.content, buffer);
        case "float":
            return encodeFloat(data.content, buffer);
        case "string":
            return encodeString(data.content, buffer);
        case "tuple":
            return encodeTuple(data.content, buffer);
        case "list":
            return encodeList(data.content, buffer);
        case "export":
            return encodeExport(data.content, buffer);
    }
}

function encodeAtom(atom: string, buffer: number[] = []) {
    if (atom.length > 0xFF) {
        return encodeAtomUtf8Ext(atom, buffer);
    }
    return encodeSmallAtomUtf8Ext(atom, buffer);
}

function encodeAtomUtf8Ext(atom: string, buffer: number[] = []) {
    buffer.push(Tag.AtomUtf8Ext);
    buffer.push(atom.length >> 8);
    buffer.push(atom.length & 0xFF);
    Buffer.from(atom).forEach(byte => buffer.push(byte));
    return buffer;
}

function encodeSmallAtomUtf8Ext(atom: string, buffer: number[] = []) {
    buffer.push(Tag.SmallAtomUtf8Ext);
    buffer.push(atom.length);
    Buffer.from(atom).forEach(byte => buffer.push(byte));
    return buffer;
}

function encodeInteger(integer: number, buffer: number[] = []) {
    if (integer > 0xFF) {
        return encodeIntegerExt(integer, buffer);
    }
    return encodeSmallIntegerExt(integer, buffer);
}

function encodeIntegerExt(integer: number, buffer: number[] = []) {
    buffer.push(Tag.IntegerExt);
    const bytes = [integer >> 24, integer >> 16 & 0xFF, integer >> 8 & 0xFF, integer & 0xFF];
    bytes.forEach(byte => buffer.push(byte));
    return buffer;
}

function encodeSmallIntegerExt(integer: number, buffer: number[] = []) {
    buffer.push(Tag.SmallIntegerExt);
    buffer.push(integer);
    return buffer;
}

function encodeFloat(float: number, buffer: number[] = []) {
    buffer.push(Tag.NewFloatExt);
    const bytes = [
        float >> 56, float >> 48 & 0xFF, float >> 40 & 0xFF, float >> 32 & 0xFF, 
        float >> 24 & 0xFF, float >> 16 & 0xFF, float >> 8 & 0xFF, float & 0xFF
    ];
    bytes.forEach(byte => buffer.push(byte));
    return buffer;
}

function encodeString(str: string, buffer: number[] = []) {
    if (str.length > 0xFFFF) {
        const list = [...str];
        return encodeList(list.map(char => toTerm("integer", char.charCodeAt(0))), buffer);
    }
    buffer.push(Tag.StringExt);
    buffer.push(str.length >> 8);
    buffer.push(str.length & 0xFF);
    Buffer.from(str).forEach(byte => buffer.push(byte));
    return buffer;
}

function encodeTuple(tuple: Term[], buffer: number[] = []) {
    if (tuple.length > 0xFF) {
        return encodeLargeTuple(tuple, buffer);
    }
    return encodeSmallTuple(tuple, buffer);
}

function encodeLargeTuple(tuple: Term[], buffer: number[] = []) {
    buffer.push(Tag.LargeTupleExt);
    const bytes = [tuple.length >> 24, tuple.length >> 16 & 0xFF, tuple.length >> 8 & 0xFF, tuple.length & 0xFF];
    bytes.forEach(byte => buffer.push(byte));
    const subEncode = tuple.map(data => encodeErlangData(data));
    return buffer.concat(...subEncode);
}

function encodeSmallTuple(tuple: Term[], buffer: number[] = []) {
    buffer.push(Tag.SmallTupleExt);
    buffer.push(tuple.length);
    const subEncode = tuple.map(data => encodeErlangData(data));
    return buffer.concat(...subEncode);
}

function encodeList(list: Term[], buffer: number[] = []) {
    buffer.push(Tag.ListExt);
    const bytes = [list.length >> 24, list.length >> 16 & 0xFF, list.length >> 8 & 0xFF, list.length & 0xFF];
    bytes.forEach(byte => buffer.push(byte));
    const subEncode = list.map(data => encodeErlangData(data));
    return buffer.concat(...subEncode, Tag.NilExt);
}

function encodeExport([module, fun, arity]: [string, string, number], buffer: number[]) {
    buffer.push(Tag.ExportExt);
    return buffer.concat(encodeAtom(module), encodeAtom(fun), encodeInteger(arity));
}

export function decode(data: Buffer) {
    if (data[0] !== Tag.Version) {
        throw new Error(`Unknown tag version: ${data[0]}`);
    }
    const {term, offset} = decodeErlangData(data, 1);
    if (offset !== data.length) {
        throw new Error("Unable to deocde all data");
    }
    return term;
}

function decodeErlangData(data: Buffer, offset: number): { term: Term; offset: number } {
    switch (data[offset++]) {
        case Tag.AtomUtf8Ext:
            const atomUtf8Ext = decodeAtomUtf8Ext(data, offset);
            return { term: toTerm("atom", atomUtf8Ext.atom), offset: atomUtf8Ext.offset };
        case Tag.SmallAtomUtf8Ext:
            const smallAtomUtf8Ext = decodeSmallAtomUtf8Ext(data, offset);
            return { term: toTerm("atom", smallAtomUtf8Ext.atom), offset: smallAtomUtf8Ext.offset };
        case Tag.IntegerExt:
            const integerExt = decodeIntegerExt(data, offset);
            return { term: toTerm("integer", integerExt.integer), offset: integerExt.offset };
        case Tag.SmallIntegerExt:
            const smallIntegerExt = decodeSmallIntegerExt(data, offset);
            return { term: toTerm("integer", smallIntegerExt.integer), offset: smallIntegerExt.offset };
        case Tag.NewFloatExt:
            const newFloatExt = decodeNewFloatExt(data, offset);
            return { term: toTerm("float", newFloatExt.float), offset: newFloatExt.offset };
        case Tag.StringExt:
            const stringExt = decodeStringExt(data, offset);
            return { term: toTerm("string", stringExt.str), offset: stringExt.offset };
        case Tag.LargeTupleExt:
            const largeTupleExt = decodeLargeTupleExt(data, offset);
            return { term: toTerm("tuple", largeTupleExt.tuple), offset: largeTupleExt.offset };
        case Tag.SmallTupleExt:
            const smallTupleExt = decodeSmallTupleExt(data, offset);
            return { term: toTerm("tuple", smallTupleExt.tuple), offset: smallTupleExt.offset };
        case Tag.ListExt:
            const listExt = decodeListExt(data, offset);
            return { term: toTerm("list", listExt.list), offset: listExt.offset };
        case Tag.ExportExt:
            const exportExt = decodeExportExt(data, offset);
            return { term: toTerm("export", exportExt.export), offset: exportExt.offset };
        default:
            throw new Error(`Unable to decode tag: ${data[offset]}`);
    }
}

function decodeAtomUtf8Ext(data: Buffer, offset: number) {
    const length = bufferTo16Int(data, offset);
    return decodeAtomUtf8(data, offset + 2, length);
}

function decodeSmallAtomUtf8Ext(data: Buffer, offset: number) {
    const length = bufferTo8Int(data, offset);
    return decodeAtomUtf8(data, offset + 1, length);
}

function decodeAtomUtf8(data: Buffer, offset: number, length: number) {
    const end = offset + length;
    return { atom: data.toString("utf8", offset, end), offset: end };
}

function decodeIntegerExt(data: Buffer, offset: number) {
    return { integer: bufferTo32Int(data, offset), offset: offset + 4 };
}

function decodeSmallIntegerExt(data: Buffer, offset: number) {
    return { integer: bufferTo8Int(data, offset), offset: offset + 1 };
}

function decodeNewFloatExt(data: Buffer, offset: number) {
    return { float: bufferToFloat(data, offset), offset: offset + 8 };
}

function decodeStringExt(data: Buffer, offset: number) {
    const length = bufferTo16Int(data, offset);
    const end = offset + 2 + length;
    return { str: data.toString("utf8", end - length, end), offset: end };
}

function decodeLargeTupleExt(data: Buffer, offset: number) {
    const arity = bufferTo32Int(data, offset);
    return decodeTuple(data, offset + 4, arity);
}

function decodeSmallTupleExt(data: Buffer, offset: number) {
    const arity = bufferTo8Int(data, offset);
    return decodeTuple(data, offset + 1, arity);
}

function decodeTuple(data: Buffer, offset: number, arity: number, elements: Term[] = []) {
    if (arity === elements.length) {
        return { tuple: elements, offset };
    }
    const decode = decodeErlangData(data, offset);
    elements.push(decode.term);
    return decodeTuple(data, decode.offset, arity, elements);
}

function decodeListExt(data: Buffer, offset: number) {
    const arity = bufferTo32Int(data, offset);
    return decodeList(data, offset + 4, arity);
}

function decodeList(data: Buffer, offset: number, arity: number, elements: Term[] = []) {
    if (arity === elements.length) {
        if (data[offset] !== Tag.NilExt) {
            throw new Error(`Unable to decode improper list`);
        }
        return { list: elements, offset: offset + 1 };
    }
    const decode = decodeErlangData(data, offset);
    elements.push(decode.term);
    return decodeList(data, decode.offset, arity, elements);
}

function decodeExportExt(data: Buffer, offset: number): { export: [string, string, number], offset: number } {
    const module = decodeSmallAtomUtf8Ext(data, offset);
    const fun = decodeSmallAtomUtf8Ext(data, module.offset);
    const arity = decodeSmallIntegerExt(data, fun.offset);
    return { export: [module.atom, fun.atom, arity.integer], offset: arity.offset };
}

function bufferTo8Int(data: Buffer, offset: number) {
    return data[offset];
}

function bufferTo16Int(data: Buffer, offset: number) {
    return data[offset] << 8 | data[offset + 1];
}

function bufferTo32Int(data: Buffer, offset: number) {
    return data[offset] << 24 | data[offset + 1] << 16 | data[offset + 2] << 8 | data[offset + 3];
}

function bufferToFloat(data: Buffer, offset: number) {
    return data[offset] << 56 | data[offset + 1] << 48 |data[offset + 2] << 40 | data[offset + 3] << 32 |
        data[offset + 4] << 24 | data[offset + 5] << 16 | data[offset + 6] << 8 | data[offset + 7];
}

function toTerm(type: "atom", content: string): Atom;
function toTerm(type: "integer", content: number): Integer;
function toTerm(type: "float", content: number): Float;
function toTerm(type: "string", content: string): String;
function toTerm<T extends Term[]>(type: "tuple", content: Term[]): Tuple<T>;
function toTerm<T extends Term[]>(type: "list", content: Term[]): List<T>;
function toTerm(type: "export", content: [string, string, number]): Export;
function toTerm(type: ErlangType, content: ErlangContent) {
    switch (type) {
        case "atom":
            return { type, content, toString: () => content };
        case "integer":
            return { type, content, toString: () => content.toString() };
        case "float":
            return { type, content, toString: () => content.toString() };
        case "string":
            return { type, content, toString: () => content };
        case "tuple":
            return { type, content, toString: () => `{${(content as Term[]).map(term => `${term.toString()}, `).join("").slice(0, -2)}}` };
        case "list":
            return { type, content, toString: () => `[${(content as Term[]).map(term => `${term.toString()}, `).join("").slice(0, -2)}]` };
        case "export":
            const exportContent = content as [string, string, number];
            return { type, content, toString: () => `fun ${exportContent[0]}:${exportContent[1]}/${exportContent[2]}` };
        default:
            break;
    }
    return { type, content };
}

export function erlangRequest(module: string, fun: string, arity: number, ...args: Term[]): ErlangRequest {
    const term = toTerm<[String, Export, List<Term[]>]>("tuple", [
        toTerm("string", randomUUID()),
        toTerm("export", [module, fun, arity]),
        toTerm("list", args)
    ]);
    return {
        ref: function(this: ErlangRequest) {
            return this.content[0].content;
        },
        ...term
    };
}

export const toErlangTerm = toTerm;
