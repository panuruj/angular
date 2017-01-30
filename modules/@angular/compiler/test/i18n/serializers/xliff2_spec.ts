/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {escapeRegExp} from '@angular/core/src/facade/lang';

import {serializeNodes} from '../../../src/i18n/digest';
import {MessageBundle} from '../../../src/i18n/message_bundle';
import {Xliff2} from '../../../src/i18n/serializers/xliff2';
import {HtmlParser} from '../../../src/ml_parser/html_parser';
import {DEFAULT_INTERPOLATION_CONFIG} from '../../../src/ml_parser/interpolation_config';

const HTML = `
<p i18n-title title="translatable attribute">not translatable</p>
<p i18n>translatable element <b>with placeholders</b> {{ interpolation}}</p>
<p i18n="m|d@@i">foo</p>
<p i18n="nested"><b><u>{{interpolation}} Text</u></b></p>
<p i18n="ph names"><br><img src="1.jpg"><img src="2.jpg"></p>
<p i18n="empty element">hello <span></span></p>
`;

const WRITE_XLIFF = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en">
  <file original="ng.template" id="ngi18n">
    <unit id="983775b9a51ce14b036be72d4cfd65d68d64e231">
      <segment>
        <source>translatable attribute</source>
      </segment>
    </unit>
    <unit id="ec1d033f2436133c14ab038286c4f5df4697484a">
      <segment>
        <source>translatable element <pc id="0" equivStart="START_BOLD_TEXT" equivEnd="CLOSE_BOLD_TEXT" type="fmt" dispStart="&lt;b&gt;" dispEnd="&lt;/b&gt;">with placeholders</pc> <ph id="1" equiv="INTERPOLATION" disp="{{ interpolation}}"/></source>
      </segment>
    </unit>
    <unit id="i">
      <notes>
        <note category="description">d</note>
        <note category="meaning">m</note>
      </notes>
      <segment>
        <source>foo</source>
      </segment>
    </unit>
    <unit id="6766186b23e26e46114f5b05a263c1aa2aae08bc">
      <notes>
        <note category="description">nested</note>
      </notes>
      <segment>
        <source><pc id="0" equivStart="START_BOLD_TEXT" equivEnd="CLOSE_BOLD_TEXT" type="fmt" dispStart="&lt;b&gt;" dispEnd="&lt;/b&gt;"><pc id="1" equivStart="START_UNDERLINED_TEXT" equivEnd="CLOSE_UNDERLINED_TEXT" type="fmt" dispStart="&lt;u&gt;" dispEnd="&lt;/u&gt;"><ph id="2" equiv="INTERPOLATION" disp="{{interpolation}}"/> Text</pc></pc></source>
      </segment>
    </unit>
    <unit id="5111eec79a97de6b483081a9a4258fa50e252b02">
      <notes>
        <note category="description">ph names</note>
      </notes>
      <segment>
        <source><ph id="0" equiv="LINE_BREAK" type="fmt" disp="&lt;br/&gt;"/><ph id="1" equiv="TAG_IMG" type="image" disp="&lt;img/&gt;"/><ph id="2" equiv="TAG_IMG_1" type="image" disp="&lt;img/&gt;"/></source>
      </segment>
    </unit>
    <unit id="52e40be15fbdc88ac4ce36b63899b88d779022ba">
      <notes>
        <note category="description">empty element</note>
      </notes>
      <segment>
        <source>hello <pc id="0" equivStart="START_TAG_SPAN" equivEnd="CLOSE_TAG_SPAN" type="other" dispStart="&lt;span&gt;" dispEnd="&lt;/span&gt;"></pc></source>
      </segment>
    </unit>
  </file>
</xliff>
`;

const LOAD_XLIFF = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="fr">
  <file original="ng.template" id="ngi18n">
    <unit id="983775b9a51ce14b036be72d4cfd65d68d64e231">
      <segment>
        <source>translatable attribute</source>
        <target>etubirtta elbatalsnart</target>
      </segment>
    </unit>
    <unit id="ec1d033f2436133c14ab038286c4f5df4697484a">
      <segment>
        <source>translatable element <pc id="0" equivStart="START_BOLD_TEXT" equivEnd="CLOSE_BOLD_TEXT" type="fmt" dispStart="&lt;b&gt;" dispEnd="&lt;/b&gt;">with placeholders</pc> <ph id="1" equiv="INTERPOLATION" disp="{{ interpolation}}"/></source>
        <target><ph id="1" equiv="INTERPOLATION" disp="{{ interpolation}}"/> <pc id="0" equivStart="START_BOLD_TEXT" equivEnd="CLOSE_BOLD_TEXT" type="fmt" dispStart="&lt;b&gt;" dispEnd="&lt;/b&gt;">sredlohecalp htiw</pc> tnemele elbatalsnart</target>
      </segment>
    </unit>
    <unit id="db3e0a6a5a96481f60aec61d98c3eecddef5ac23">
      <notes>
        <note category="description">d</note>
        <note category="meaning">m</note>
      </notes>
      <segment>
        <source>foo</source>
        <target>oof</target>
      </segment>
    </unit>
    <unit id="6766186b23e26e46114f5b05a263c1aa2aae08bc">
      <notes>
        <note category="description">nested</note>
      </notes>
      <segment>
        <source><pc id="0" equivStart="START_BOLD_TEXT" equivEnd="CLOSE_BOLD_TEXT" type="fmt" dispStart="&lt;b&gt;" dispEnd="&lt;/b&gt;"><pc id="1" equivStart="START_UNDERLINED_TEXT" equivEnd="CLOSE_UNDERLINED_TEXT" type="fmt" dispStart="&lt;u&gt;" dispEnd="&lt;/u&gt;"><ph id="2" equiv="INTERPOLATION" disp="{{interpolation}}"/> Text</pc></pc></source>
        <target><pc id="0" equivStart="START_BOLD_TEXT" equivEnd="CLOSE_BOLD_TEXT" type="fmt" dispStart="&lt;b&gt;" dispEnd="&lt;/b&gt;"><pc id="1" equivStart="START_UNDERLINED_TEXT" equivEnd="CLOSE_UNDERLINED_TEXT" type="fmt" dispStart="&lt;u&gt;" dispEnd="&lt;/u&gt;">txeT <ph id="2" equiv="INTERPOLATION" disp="{{interpolation}}"/></pc></pc></target>
      </segment>
    </unit>
    <unit id="5111eec79a97de6b483081a9a4258fa50e252b02">
      <notes>
        <note category="description">ph names</note>
      </notes>
      <segment>
        <source><ph id="0" equiv="LINE_BREAK" type="fmt" disp="&lt;br/&gt;"/><ph id="1" equiv="TAG_IMG" type="image" disp="&lt;img/&gt;"/><ph id="2" equiv="TAG_IMG_1" type="image" disp="&lt;img/&gt;"/></source>
        <target><ph id="2" equiv="TAG_IMG_1" type="image" disp="&lt;img/&gt;"/><ph id="1" equiv="TAG_IMG" type="image" disp="&lt;img/&gt;"/><ph id="0" equiv="LINE_BREAK" type="fmt" disp="&lt;br/&gt;"/></target>
      </segment>
    </unit>
    <unit id="52e40be15fbdc88ac4ce36b63899b88d779022ba">
      <notes>
        <note category="description">empty element</note>
      </notes>
      <segment>
        <source>hello <pc id="0" equivStart="START_TAG_SPAN" equivEnd="CLOSE_TAG_SPAN" type="other" dispStart="&lt;span&gt;" dispEnd="&lt;/span&gt;"></pc></source>
        <target><pc id="0" equivStart="START_TAG_SPAN" equivEnd="CLOSE_TAG_SPAN" type="other" dispStart="&lt;span&gt;" dispEnd="&lt;/span&gt;"></pc> olleh</target>
      </segment>
    </unit>
  </file>
</xliff>
`;

export function main(): void {
  const serializer = new Xliff2();

  function toXliff(html: string): string {
    const catalog = new MessageBundle(new HtmlParser, [], {});
    catalog.updateFromTemplate(html, '', DEFAULT_INTERPOLATION_CONFIG);
    return catalog.write(serializer);
  }

  function loadAsMap(xliff: string): {[id: string]: string} {
    const i18nNodesByMsgId = serializer.load(xliff, 'url');
    const msgMap: {[id: string]: string} = {};
    debugger;
    Object.keys(i18nNodesByMsgId)
        .forEach(id => msgMap[id] = serializeNodes(i18nNodesByMsgId[id]).join(''));

    return msgMap;
  }

  describe('XLIFF 2.0 serializer', () => {
    describe('write', () => {
      it('should write a valid xliff 2.0 file',
         () => { expect(toXliff(HTML)).toEqual(WRITE_XLIFF); });
    });

    describe('load', () => {
      it('should load XLIFF files', () => {
        expect(loadAsMap(LOAD_XLIFF)).toEqual({
          '983775b9a51ce14b036be72d4cfd65d68d64e231': 'etubirtta elbatalsnart',
          'ec1d033f2436133c14ab038286c4f5df4697484a':
              '<ph name="INTERPOLATION"/> <ph name="START_BOLD_TEXT"/>sredlohecalp htiw<ph name="CLOSE_BOLD_TEXT"/> tnemele elbatalsnart',
          'db3e0a6a5a96481f60aec61d98c3eecddef5ac23': 'oof',
          '6766186b23e26e46114f5b05a263c1aa2aae08bc':
              '<ph name="START_BOLD_TEXT"/><ph name="START_UNDERLINED_TEXT"/>txeT <ph name="INTERPOLATION"/><ph name="CLOSE_UNDERLINED_TEXT"/><ph name="CLOSE_BOLD_TEXT"/>',
          '5111eec79a97de6b483081a9a4258fa50e252b02':
              '<ph name="TAG_IMG_1"/><ph name="TAG_IMG"/><ph name="LINE_BREAK"/>',
          '52e40be15fbdc88ac4ce36b63899b88d779022ba':
              '<ph name="START_TAG_SPAN"/><ph name="CLOSE_TAG_SPAN"/> olleh'
        });
      });
    });

    describe('structure errors', () => {
      it('should throw when a wrong xliff version is used', () => {
        const XLIFF = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file source-language="en" datatype="plaintext" original="ng2.template">
    <body>
      <trans-unit id="deadbeef">
        <source/>
        <target/>
      </trans-unit>
    </body>
  </file>
</xliff>`;

        expect(() => {
          loadAsMap(XLIFF);
        }).toThrowError(/The XLIFF file version 1.2 is not compatible with XLIFF 2.0 serializer/);
      });

      it('should throw when an unit has no translation', () => {
        const XLIFF = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en">
  <file original="ng.template" id="ngi18n">
    <unit id="missingtarget">
      <segment>
        <source/>
      </segment>
    </unit>
  </file>
</xliff>`;

        expect(() => {
          loadAsMap(XLIFF);
        }).toThrowError(/Message missingtarget misses a translation/);
      });


      it('should throw when an unit has no id attribute', () => {
        const XLIFF = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en">
  <file original="ng.template" id="ngi18n">
    <unit>
      <segment>
        <source/>
        <target/>
      </segment>
    </unit>
  </file>
</xliff>`;

        expect(() => { loadAsMap(XLIFF); }).toThrowError(/<unit> misses the "id" attribute/);
      });

      it('should throw on duplicate unit id', () => {
        const XLIFF = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en">
  <file original="ng.template" id="ngi18n">
    <unit id="deadbeef">
      <segment>
        <source/>
        <target/>
      </segment>
    </unit>
    <unit id="deadbeef">
      <segment>
        <source/>
        <target/>
      </segment>
    </unit>
  </file>
</xliff>`;

        expect(() => {
          loadAsMap(XLIFF);
        }).toThrowError(/Duplicated translations for msg deadbeef/);
      });
    });

    describe('message errors', () => {
      it('should throw on unknown message tags', () => {
        const XLIFF = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en">
  <file original="ng.template" id="ngi18n">
    <unit id="deadbeef">
      <segment>
        <source/>
        <target><b>msg should contain only ph and pc tags</b></target>
      </segment>
    </unit>
  </file>
</xliff>`;

        expect(() => { loadAsMap(XLIFF); })
            .toThrowError(new RegExp(
                escapeRegExp(`[ERROR ->]<b>msg should contain only ph and pc tags</b>`)));
      });

      it('should throw when a placeholder misses an id attribute', () => {
        const XLIFF = `<?xml version="1.0" encoding="UTF-8" ?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en">
  <file original="ng.template" id="ngi18n">
    <unit id="deadbeef">
      <segment>
        <source/>
        <target><ph/></target>
      </segment>
    </unit>
  </file>
</xliff>`;

        expect(() => {
          loadAsMap(XLIFF);
        }).toThrowError(new RegExp(escapeRegExp(`<ph> misses the "equiv" attribute`)));
      });
    });
  });
}