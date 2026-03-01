/**
 * Factory for creating typed Nape List + Iterator class pairs.
 *
 * All compiled Nape list classes (CbTypeList, BodyList, ShapeList, etc.) share
 * identical structure — only the element type name, ZPP backing class, and
 * wrap/unwrap callbacks differ. This factory generates drop-in replacements
 * for the compiled classes and registers them in the nape namespace.
 *
 * @internal
 */
import { getNape } from "../core/engine";

type Any = any;

export interface ListSpec {
  /** Element type name for error messages, e.g. "CbType" */
  typeName: string;
  /** Namespace path for the Iterator, e.g. ["nape", "callbacks"] */
  namespaceParts: string[];
  /** ZPP list class name in zpp_nape.util, e.g. "ZPP_CbTypeList" */
  zppListClass: string;
  /** Extract the public element from an internal linked-list node element.
   *  Standard: `elt => elt.outer`, wrapper: `elt => elt.wrapper()`, direct: `elt => elt` */
  wrapElement: (elt: Any) => Any;
  /** Extract the internal element from a public API object.
   *  Standard: `obj => obj.zpp_inner`, direct: `obj => obj` */
  unwrapElement: (obj: Any) => Any;
}

/**
 * Creates and registers a typed Iterator + List pair in the nape namespace.
 *
 * The generated classes are fully compatible with the compiled Haxe originals:
 * same prototype shape, same static properties, same pooling behaviour.
 */
export function createListClasses(spec: ListSpec): {
  Iterator: Any;
  List: Any;
} {
  const { typeName, namespaceParts, zppListClass, wrapElement, unwrapElement } = spec;

  const nape = getNape();
  const zpp = nape.__zpp;

  // Resolve the ZPP list class (e.g. zpp_nape.util.ZPP_CbTypeList)
  const getZPPListClass = () => zpp.util[zppListClass];

  // Resolve the namespace object (e.g. nape.callbacks)
  const getNamespace = () => {
    let ns: Any = nape;
    for (let i = 1; i < namespaceParts.length; i++) {
      ns = ns[namespaceParts[i]];
    }
    return ns;
  };

  // ---------------------------------------------------------------------------
  // Iterator
  // ---------------------------------------------------------------------------

  function TypedIterator(this: Any) {
    this.zpp_next = null;
    this.zpp_critical = false;
    this.zpp_i = 0;
    this.zpp_inner = null;
    if (!getZPPListClass().internal) {
      throw new Error("Error: Cannot instantiate " + typeName + "Iterator derp!");
    }
  }

  TypedIterator.__name__ = [...namespaceParts, typeName + "Iterator"];

  TypedIterator.zpp_pool = null as Any;

  TypedIterator.get = function (list: Any): Any {
    let ret: Any;
    const ZPPList = getZPPListClass();
    if (TypedIterator.zpp_pool == null) {
      ZPPList.internal = true;
      ret = new (TypedIterator as Any)();
      ZPPList.internal = false;
    } else {
      ret = TypedIterator.zpp_pool;
      TypedIterator.zpp_pool = ret.zpp_next;
    }
    ret.zpp_i = 0;
    ret.zpp_inner = list;
    ret.zpp_critical = false;
    return ret;
  };

  TypedIterator.prototype.zpp_inner = null;
  TypedIterator.prototype.zpp_i = null;
  TypedIterator.prototype.zpp_critical = null;
  TypedIterator.prototype.zpp_next = null;

  TypedIterator.prototype.hasNext = function (this: Any): boolean {
    this.zpp_inner.zpp_inner.valmod();
    const _this = this.zpp_inner;
    _this.zpp_inner.valmod();
    if (_this.zpp_inner.zip_length) {
      _this.zpp_inner.zip_length = false;
      _this.zpp_inner.user_length = _this.zpp_inner.inner.length;
    }
    const length = _this.zpp_inner.user_length;
    this.zpp_critical = true;
    if (this.zpp_i < length) {
      return true;
    } else {
      this.zpp_next = TypedIterator.zpp_pool;
      TypedIterator.zpp_pool = this;
      this.zpp_inner = null;
      return false;
    }
  };

  TypedIterator.prototype.next = function (this: Any): Any {
    this.zpp_critical = false;
    return this.zpp_inner.at(this.zpp_i++);
  };

  TypedIterator.prototype.__class__ = TypedIterator;

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------

  function TypedList(this: Any) {
    this.zpp_inner = null;
    this.zpp_inner = new (getZPPListClass())();
    this.zpp_inner.outer = this;
  }

  TypedList.__name__ = [...namespaceParts, typeName + "List"];

  TypedList.fromArray = function (array: Any[]): Any {
    if (array == null) {
      throw new Error("Error: Cannot convert null Array to Nape list");
    }
    const ret = new (TypedList as Any)();
    for (let i = 0; i < array.length; i++) {
      ret.push(array[i]);
    }
    return ret;
  };

  TypedList.prototype.zpp_inner = null;

  // get_length + length property
  TypedList.prototype.get_length = function (this: Any): number {
    this.zpp_inner.valmod();
    if (this.zpp_inner.zip_length) {
      this.zpp_inner.zip_length = false;
      this.zpp_inner.user_length = this.zpp_inner.inner.length;
    }
    return this.zpp_inner.user_length;
  };

  Object.defineProperty(TypedList.prototype, "length", {
    get: function (this: Any) {
      return this.get_length();
    },
  });

  TypedList.prototype.has = function (this: Any, obj: Any): boolean {
    this.zpp_inner.valmod();
    return this.zpp_inner.inner.has(unwrapElement(obj));
  };

  TypedList.prototype.at = function (this: Any, index: number): Any {
    this.zpp_inner.valmod();
    if (index < 0 || index >= this.get_length()) {
      throw new Error("Error: Index out of bounds");
    }
    if (this.zpp_inner.reverse_flag) {
      index = this.get_length() - 1 - index;
    }
    if (index < this.zpp_inner.at_index || this.zpp_inner.at_ite == null) {
      this.zpp_inner.at_index = index;
      this.zpp_inner.at_ite = this.zpp_inner.inner.iterator_at(index);
    } else {
      while (this.zpp_inner.at_index != index) {
        this.zpp_inner.at_index++;
        this.zpp_inner.at_ite = this.zpp_inner.at_ite.next;
      }
    }
    return wrapElement(this.zpp_inner.at_ite.elt);
  };

  TypedList.prototype.push = function (this: Any, obj: Any): boolean {
    if (this.zpp_inner.immutable) {
      throw new Error("Error: " + typeName + "List is immutable");
    }
    this.zpp_inner.modify_test();
    this.zpp_inner.valmod();
    const cont = this.zpp_inner.adder != null ? this.zpp_inner.adder(obj) : true;
    if (cont) {
      if (this.zpp_inner.reverse_flag) {
        this.zpp_inner.inner.add(unwrapElement(obj));
      } else {
        if (this.zpp_inner.push_ite == null) {
          this.zpp_inner.push_ite =
            this.zpp_inner.inner.head == null
              ? null
              : this.zpp_inner.inner.iterator_at(this.get_length() - 1);
        }
        this.zpp_inner.push_ite = this.zpp_inner.inner.insert(
          this.zpp_inner.push_ite,
          unwrapElement(obj),
        );
      }
      this.zpp_inner.invalidate();
      if (this.zpp_inner.post_adder != null) {
        this.zpp_inner.post_adder(obj);
      }
    }
    return cont;
  };

  TypedList.prototype.unshift = function (this: Any, obj: Any): boolean {
    if (this.zpp_inner.immutable) {
      throw new Error("Error: " + typeName + "List is immutable");
    }
    this.zpp_inner.modify_test();
    this.zpp_inner.valmod();
    const cont = this.zpp_inner.adder != null ? this.zpp_inner.adder(obj) : true;
    if (cont) {
      if (this.zpp_inner.reverse_flag) {
        if (this.zpp_inner.push_ite == null) {
          this.zpp_inner.push_ite =
            this.zpp_inner.inner.head == null
              ? null
              : this.zpp_inner.inner.iterator_at(this.get_length() - 1);
        }
        this.zpp_inner.push_ite = this.zpp_inner.inner.insert(
          this.zpp_inner.push_ite,
          unwrapElement(obj),
        );
      } else {
        this.zpp_inner.inner.add(unwrapElement(obj));
      }
      this.zpp_inner.invalidate();
      if (this.zpp_inner.post_adder != null) {
        this.zpp_inner.post_adder(obj);
      }
    }
    return cont;
  };

  TypedList.prototype.pop = function (this: Any): Any {
    if (this.zpp_inner.immutable) {
      throw new Error("Error: " + typeName + "List is immutable");
    }
    this.zpp_inner.modify_test();
    if (this.zpp_inner.inner.head == null) {
      throw new Error("Error: Cannot remove from empty list");
    }
    this.zpp_inner.valmod();
    let ret: Any;
    if (this.zpp_inner.reverse_flag) {
      ret = this.zpp_inner.inner.head.elt;
      const retx = wrapElement(ret);
      if (this.zpp_inner.subber != null) {
        this.zpp_inner.subber(retx);
      }
      if (!this.zpp_inner.dontremove) {
        this.zpp_inner.inner.pop();
      }
    } else {
      if (this.zpp_inner.at_ite != null && this.zpp_inner.at_ite.next == null) {
        this.zpp_inner.at_ite = null;
      }
      let ite: Any;
      if (this.get_length() == 1) {
        ite = null;
      } else {
        ite = this.zpp_inner.inner.iterator_at(this.get_length() - 2);
      }
      ret = ite == null ? this.zpp_inner.inner.head.elt : ite.next.elt;
      const retx = wrapElement(ret);
      if (this.zpp_inner.subber != null) {
        this.zpp_inner.subber(retx);
      }
      if (!this.zpp_inner.dontremove) {
        this.zpp_inner.inner.erase(ite);
      }
    }
    this.zpp_inner.invalidate();
    return wrapElement(ret);
  };

  TypedList.prototype.shift = function (this: Any): Any {
    if (this.zpp_inner.immutable) {
      throw new Error("Error: " + typeName + "List is immutable");
    }
    this.zpp_inner.modify_test();
    if (this.zpp_inner.inner.head == null) {
      throw new Error("Error: Cannot remove from empty list");
    }
    this.zpp_inner.valmod();
    let ret: Any;
    if (this.zpp_inner.reverse_flag) {
      if (this.zpp_inner.at_ite != null && this.zpp_inner.at_ite.next == null) {
        this.zpp_inner.at_ite = null;
      }
      let ite: Any;
      if (this.get_length() == 1) {
        ite = null;
      } else {
        ite = this.zpp_inner.inner.iterator_at(this.get_length() - 2);
      }
      ret = ite == null ? this.zpp_inner.inner.head.elt : ite.next.elt;
      const retx = wrapElement(ret);
      if (this.zpp_inner.subber != null) {
        this.zpp_inner.subber(retx);
      }
      if (!this.zpp_inner.dontremove) {
        this.zpp_inner.inner.erase(ite);
      }
    } else {
      ret = this.zpp_inner.inner.head.elt;
      const retx = wrapElement(ret);
      if (this.zpp_inner.subber != null) {
        this.zpp_inner.subber(retx);
      }
      if (!this.zpp_inner.dontremove) {
        this.zpp_inner.inner.pop();
      }
    }
    this.zpp_inner.invalidate();
    return wrapElement(ret);
  };

  TypedList.prototype.add = function (this: Any, obj: Any): boolean {
    if (this.zpp_inner.reverse_flag) {
      return this.push(obj);
    } else {
      return this.unshift(obj);
    }
  };

  TypedList.prototype.remove = function (this: Any, obj: Any): boolean {
    if (this.zpp_inner.immutable) {
      throw new Error("Error: " + typeName + "List is immutable");
    }
    this.zpp_inner.modify_test();
    this.zpp_inner.valmod();
    // Search for element in internal list
    let found = false;
    let cx_ite = this.zpp_inner.inner.head;
    const target = unwrapElement(obj);
    while (cx_ite != null) {
      if (cx_ite.elt == target) {
        found = true;
        break;
      }
      cx_ite = cx_ite.next;
    }
    if (found) {
      if (this.zpp_inner.subber != null) {
        this.zpp_inner.subber(obj);
      }
      if (!this.zpp_inner.dontremove) {
        this.zpp_inner.inner.remove(target);
      }
      this.zpp_inner.invalidate();
    }
    return found;
  };

  TypedList.prototype.clear = function (this: Any): void {
    if (this.zpp_inner.immutable) {
      throw new Error("Error: " + typeName + "List is immutable");
    }
    if (this.zpp_inner.reverse_flag) {
      while (this.zpp_inner.inner.head != null) this.pop();
    } else {
      while (this.zpp_inner.inner.head != null) this.shift();
    }
  };

  TypedList.prototype.empty = function (this: Any): boolean {
    return this.zpp_inner.inner.head == null;
  };

  TypedList.prototype.iterator = function (this: Any): Any {
    this.zpp_inner.valmod();
    return TypedIterator.get(this);
  };

  TypedList.prototype.copy = function (this: Any, deep?: boolean): Any {
    if (deep == null) deep = false;
    const ret = new (TypedList as Any)();
    const it = TypedIterator.get(this);
    while (it.hasNext()) {
      const i = it.next();
      if (deep) {
        throw new Error("Error: " + typeName + " is not a copyable type");
      }
      ret.push(i);
    }
    return ret;
  };

  TypedList.prototype.merge = function (this: Any, xs: Any): void {
    if (xs == null) {
      throw new Error("Error: Cannot merge with null list");
    }
    const it = TypedIterator.get(xs);
    while (it.hasNext()) {
      const x = it.next();
      if (!this.has(x)) {
        if (this.zpp_inner.reverse_flag) {
          this.push(x);
        } else {
          this.unshift(x);
        }
      }
    }
  };

  TypedList.prototype.toString = function (this: Any): string {
    let ret = "[";
    let fst = true;
    const it = TypedIterator.get(this);
    while (it.hasNext()) {
      const i = it.next();
      if (!fst) ret += ",";
      ret += i == null ? "NULL" : i.toString();
      fst = false;
    }
    return ret + "]";
  };

  TypedList.prototype.foreach = function (this: Any, lambda: Any): Any {
    if (lambda == null) {
      throw new Error("Error: Cannot execute null on list elements");
    }
    this.zpp_inner.valmod();
    const it = TypedIterator.get(this);
    while (it.hasNext()) {
      try {
        lambda(it.next());
      } catch {
        // On exception, return iterator to pool and break
        it.zpp_next = TypedIterator.zpp_pool;
        TypedIterator.zpp_pool = it;
        it.zpp_inner = null;
        break;
      }
    }
    return this;
  };

  TypedList.prototype.filter = function (this: Any, lambda: Any): Any {
    if (lambda == null) {
      throw new Error("Error: Cannot select elements of list with null");
    }
    let i = 0;
    while (i < this.get_length()) {
      const x = this.at(i);
      try {
        if (lambda(x)) {
          ++i;
        } else {
          this.remove(x);
        }
      } catch {
        break;
      }
    }
    return this;
  };

  TypedList.prototype.__class__ = TypedList;

  // ---------------------------------------------------------------------------
  // Register in nape namespace
  // ---------------------------------------------------------------------------

  const ns = getNamespace();
  const iterName = typeName + "Iterator";
  const listName = typeName + "List";

  ns[iterName] = TypedIterator;
  ns[listName] = TypedList;

  return { Iterator: TypedIterator, List: TypedList };
}
