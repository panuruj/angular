/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import * as ml from '../../ml_parser/ast';
import {XmlParser} from '../../ml_parser/xml_parser';
import {digest} from '../digest';
import * as i18n from '../i18n_ast';
import {I18nError} from '../parse_util';

import {Serializer} from './serializer';
import * as xml from './xml_helper';

const _VERSION = '2.0';
const _XMLNS = 'urn:oasis:names:tc:xliff:document:2.0';
// TODO(vicb): make this a param (s/_/-/)
const _SOURCE_LANG = 'en';
const _PLACEHOLDER_TAG = 'ph';
const _PLACEHOLDER_SPANNING_TAG = 'pc';

const _XLIFF_TAG = 'xliff';
const _SOURCE_TAG = 'source';
const _TARGET_TAG = 'target';
const _UNIT_TAG = 'unit';

// hhttp://docs.oasis-open.org/xliff/xliff-core/v2.0/os/xliff-core-v2.0-os.html
export class Xliff2 extends Serializer {
  write(messages: i18n.Message[]): string {
    const visitor = new _WriteVisitor();
    const visited: {[id: string]: boolean} = {};
    const units: xml.Node[] = [];

    messages.forEach(message => {
      const id = this.digest(message);

      // deduplicate messages
      if (visited[id]) return;
      visited[id] = true;

      const unit = new xml.Tag(_UNIT_TAG, {id});

      if (message.description || message.meaning) {
        const notes = new xml.Tag('notes');
        if (message.description) {
          notes.children.push(
              new xml.CR(8),
              new xml.Tag('note', {category: 'description'}, [new xml.Text(message.description)]));
        }

        if (message.meaning) {
          notes.children.push(
              new xml.CR(8),
              new xml.Tag('note', {category: 'meaning'}, [new xml.Text(message.meaning)]));
        }

        notes.children.push(new xml.CR(6));
        unit.children.push(new xml.CR(6), notes);
      }

      const segment = new xml.Tag('segment');

      segment.children.push(
          new xml.CR(8), new xml.Tag(_SOURCE_TAG, {}, visitor.serialize(message.nodes)),
          new xml.CR(6));

      unit.children.push(new xml.CR(6), segment);

      unit.children.push(new xml.CR(4));

      units.push(new xml.CR(4), unit);
    });

    const file =
        new xml.Tag('file', {'original': 'ng.template', id: 'ngi18n'}, [...units, new xml.CR(2)]);

    const xliff = new xml.Tag(
        _XLIFF_TAG, {version: _VERSION, xmlns: _XMLNS, srcLang: _SOURCE_LANG},
        [new xml.CR(2), file, new xml.CR()]);

    return xml.serialize([
      new xml.Declaration({version: '1.0', encoding: 'UTF-8'}), new xml.CR(), xliff, new xml.CR()
    ]);
  }

  load(content: string, url: string): {[msgId: string]: i18n.Node[]} {
    // xliff to xml nodes
    const xliff2Parser = new Xliff2Parser();
    const {mlNodesByMsgId, errors} = xliff2Parser.parse(content, url);

    // xml nodes to i18n nodes
    const i18nNodesByMsgId: {[msgId: string]: i18n.Node[]} = {};
    const converter = new XmlToI18n();
    Object.keys(mlNodesByMsgId).forEach(msgId => {
      const {i18nNodes, errors: e} = converter.convert(mlNodesByMsgId[msgId]);
      errors.push(...e);
      i18nNodesByMsgId[msgId] = i18nNodes;
    });

    if (errors.length) {
      throw new Error(`xliff2 parse errors:\n${errors.join('\n')}`);
    }

    return i18nNodesByMsgId;
  }

  digest(message: i18n.Message): string { return digest(message); }
}

class _WriteVisitor implements i18n.Visitor {
  private _isInIcu: boolean;
  private _nextPlaceholderId: number;

  visitText(text: i18n.Text, context?: any): xml.Node[] { return [new xml.Text(text.value)]; }

  visitContainer(container: i18n.Container, context?: any): xml.Node[] {
    const nodes: xml.Node[] = [];
    container.children.forEach((node: i18n.Node) => nodes.push(...node.visit(this)));
    return nodes;
  }

  visitIcu(icu: i18n.Icu, context?: any): xml.Node[] {
    if (this._isInIcu) {
      // nested ICU is not supported
      throw new Error('xliff does not support nested ICU messages');
    }
    this._isInIcu = true;

    // TODO(vicb): support ICU messages
    // https://lists.oasis-open.org/archives/xliff/201201/msg00028.html
    // http://docs.oasis-open.org/xliff/v1.2/xliff-profile-po/xliff-profile-po-1.2-cd02.html
    const nodes: xml.Node[] = [];

    this._isInIcu = false;

    return nodes;
  }

  visitTagPlaceholder(ph: i18n.TagPlaceholder, context?: any): xml.Node[] {
    const type = getTypeForTag(ph.tag);

    if (ph.isVoid) {
      const tagPh = new xml.Tag(_PLACEHOLDER_TAG, {
        id: (this._nextPlaceholderId++).toString(),
        equiv: ph.startName,
        type: type,
        disp: `<${ph.tag}/>`,
      });
      return [tagPh];
    }

    const tagPc = new xml.Tag(_PLACEHOLDER_SPANNING_TAG, {
      id: (this._nextPlaceholderId++).toString(),
      equivStart: ph.startName,
      equivEnd: ph.closeName,
      type: type,
      dispStart: `<${ph.tag}>`,
      dispEnd: `</${ph.tag}>`,
    });
    const nodes: xml.Node[] = [].concat(...ph.children.map(node => node.visit(this)));
    if (nodes.length) {
      nodes.forEach((node: xml.Node) => tagPc.children.push(node));
    } else {
      tagPc.children.push(new xml.Text(''));
    }

    return [tagPc];
  }

  visitPlaceholder(ph: i18n.Placeholder, context?: any): xml.Node[] {
    return [new xml.Tag(_PLACEHOLDER_TAG, {
      id: (this._nextPlaceholderId++).toString(),
      equiv: ph.name,
      disp: `{{${ph.value}}}`,
    })];
  }

  visitIcuPlaceholder(ph: i18n.IcuPlaceholder, context?: any): xml.Node[] {
    return [new xml.Tag(_PLACEHOLDER_TAG, {id: (this._nextPlaceholderId++).toString()})];
  }

  serialize(nodes: i18n.Node[]): xml.Node[] {
    this._isInIcu = false;
    this._nextPlaceholderId = 0;
    return [].concat(...nodes.map(node => node.visit(this)));
  }
}

// Extract messages as xml nodes from the xliff file
class Xliff2Parser implements ml.Visitor {
  private _unitMlNodes: ml.Node[];
  private _errors: I18nError[];
  private _mlNodesByMsgId: {[msgId: string]: ml.Node[]};

  parse(xliff: string, url: string) {
    this._unitMlNodes = [];
    this._mlNodesByMsgId = {};

    const xml = new XmlParser().parse(xliff, url, false);

    this._errors = xml.errors;
    ml.visitAll(this, xml.rootNodes, null);

    return {
      mlNodesByMsgId: this._mlNodesByMsgId,
      errors: this._errors,
    };
  }

  visitElement(element: ml.Element, context: any): any {
    switch (element.name) {
      case _UNIT_TAG:
        this._unitMlNodes = null;
        const idAttr = element.attrs.find((attr) => attr.name === 'id');
        if (!idAttr) {
          this._addError(element, `<${_UNIT_TAG}> misses the "id" attribute`);
        } else {
          const id = idAttr.value;
          if (this._mlNodesByMsgId.hasOwnProperty(id)) {
            this._addError(element, `Duplicated translations for msg ${id}`);
          } else {
            ml.visitAll(this, element.children, null);
            if (this._unitMlNodes) {
              this._mlNodesByMsgId[id] = this._unitMlNodes;
            } else {
              this._addError(element, `Message ${id} misses a translation`);
            }
          }
        }
        break;

      case _SOURCE_TAG:
        // ignore source message
        break;

      case _TARGET_TAG:
        this._unitMlNodes = element.children;
        break;

      case _XLIFF_TAG:
        const versionAttr = element.attrs.find((attr) => attr.name === 'version');
        if (versionAttr) {
          const version = versionAttr.value;
          if (version !== '2.0') {
            this._addError(
                element,
                `The XLIFF file version ${version} is not compatible with XLIFF 2.0 serializer`);
          } else {
            ml.visitAll(this, element.children, null);
          }
        }
        break;
      default:
        ml.visitAll(this, element.children, null);
    }
  }

  visitAttribute(attribute: ml.Attribute, context: any): any {}

  visitText(text: ml.Text, context: any): any {}

  visitComment(comment: ml.Comment, context: any): any {}

  visitExpansion(expansion: ml.Expansion, context: any): any {}

  visitExpansionCase(expansionCase: ml.ExpansionCase, context: any): any {}

  private _addError(node: ml.Node, message: string): void {
    this._errors.push(new I18nError(node.sourceSpan, message));
  }
}

// Convert ml nodes (xliff syntax) to i18n nodes
class XmlToI18n implements ml.Visitor {
  private _errors: I18nError[];

  convert(nodes: ml.Node[]) {
    this._errors = [];
    return {
      i18nNodes: [].concat(...nodes.map(node => node.visit(this, null))),
      errors: this._errors,
    };
  }

  visitText(text: ml.Text, context: any) { return new i18n.Text(text.value, text.sourceSpan); }

  visitElement(el: ml.Element, context: any): i18n.Node[] {
    switch (el.name) {
      case _PLACEHOLDER_TAG:
        const nameAttr = el.attrs.find((attr) => attr.name === 'equiv');
        if (nameAttr) {
          return [new i18n.Placeholder('', nameAttr.value, el.sourceSpan)];
        }

        this._addError(el, `<${_PLACEHOLDER_TAG}> misses the "equiv" attribute`);
        break;
      case _PLACEHOLDER_SPANNING_TAG:
        const startAttr = el.attrs.find((attr) => attr.name === 'equivStart');
        const endAttr = el.attrs.find((attr) => attr.name === 'equivEnd');

        if (!startAttr) {
          this._addError(el, `<${_PLACEHOLDER_TAG}> misses the "equivStart" attribute`);
        } else if (!endAttr) {
          this._addError(el, `<${_PLACEHOLDER_TAG}> misses the "equivEnd" attribute`);
        } else {
          const startId = startAttr.value;
          const endId = endAttr.value;

          return [
            new i18n.Placeholder('', startId, el.sourceSpan),
            ...[].concat(...el.children.map(node => node.visit(this, null))),
            new i18n.Placeholder('', endId, el.sourceSpan),
          ];
        }
        break;
      default:
        this._addError(el, `Unexpected tag`);
    }
  }

  visitExpansion(icu: ml.Expansion, context: any) {}

  visitExpansionCase(icuCase: ml.ExpansionCase, context: any): any {}

  visitComment(comment: ml.Comment, context: any) {}

  visitAttribute(attribute: ml.Attribute, context: any) {}

  private _addError(node: ml.Node, message: string): void {
    this._errors.push(new I18nError(node.sourceSpan, message));
  }
}

function getTypeForTag(tag: string): string {
  switch (tag.toLowerCase()) {
    case 'br':
    case 'b':
    case 'i':
    case 'u':
      return 'fmt';
    case 'img':
      return 'image';
    case 'a':
      return 'link';
    default:
      return 'other';
  }
}