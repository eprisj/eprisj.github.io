import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, Font } from '@react-pdf/renderer';
import type { PassportFields } from './passportRender';
import { generateSignatureString } from '../../lib/passportCode';

let _fontsRegistered = false;
function registerFonts(baseUrl: string) {
  if (_fontsRegistered) return;
  _fontsRegistered = true;
  const f = (file: string) => `${baseUrl}/fonts/${file}`;
  Font.register({ family: 'PTSerif', src: f('PTSerif-Regular.ttf') });
  Font.register({ family: 'PTSerifItalic', src: f('PTSerif-Italic.ttf') });
  Font.register({ family: 'PTSerifBold', src: f('PTSerif-Bold.ttf') });
  Font.register({ family: 'PTSans', src: f('PTSans-Regular.ttf') });
  Font.register({ family: 'PTSansBold', src: f('PTSans-Bold.ttf') });
  Font.registerHyphenationCallback((word) => [word]);
}

const c = { burgundy: '#501a2c', cream: '#f7f2ea', sand: '#c9a690', ink: '#241016' };

// A4-landscape-ish card, 297x180mm in points-equivalent (72dpi): scaled down.
const W = 760;
const H = 480;

const s = StyleSheet.create({
  page: { width: W, height: H, backgroundColor: c.cream, padding: 28, position: 'relative' },
  border: { position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, borderWidth: 2, borderColor: c.burgundy },
  headerTitle: { fontFamily: 'PTSerifBold', fontSize: 22, color: c.burgundy },
  headerSub: { fontFamily: 'PTSans', fontSize: 8, color: c.burgundy, opacity: 0.8, marginTop: 2, letterSpacing: 1 },
  banner: { backgroundColor: c.burgundy, paddingVertical: 6, marginTop: 10, marginBottom: 14 },
  bannerText: { fontFamily: 'PTSansBold', fontSize: 9, color: c.cream, textAlign: 'center', letterSpacing: 0.5 },
  body: { flexDirection: 'row', gap: 20 },
  photo: { width: 130, height: 170, objectFit: 'cover', borderWidth: 2, borderColor: c.burgundy },
  fieldsCol: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  fieldBox: { width: '50%', marginBottom: 14 },
  label: { fontFamily: 'PTSans', fontSize: 6.5, color: c.burgundy, opacity: 0.7, letterSpacing: 0.5 },
  value: { fontFamily: 'PTSerifBold', fontSize: 13, color: c.ink, marginTop: 2 },
  motto: { fontFamily: 'PTSerifItalic', fontSize: 10, color: c.burgundy, marginTop: 6 },
  sigBox: { marginTop: 14, backgroundColor: 'rgba(80,26,44,0.06)', padding: 8 },
  sigText: { fontFamily: 'PTSans', fontSize: 9, color: c.burgundy, letterSpacing: 1 },
  qr: { width: 84, height: 84 },
  qrCaption: { fontFamily: 'PTSans', fontSize: 6, color: c.burgundy, textAlign: 'center', marginTop: 4, letterSpacing: 0.5 },
  watermark: { position: 'absolute', top: 190, left: 120, fontFamily: 'PTSansBold', fontSize: 34, color: c.burgundy, opacity: 0.12, transform: 'rotate(-18deg)' },
});

function FieldPDF({ en, fr, value }: { en: string; fr: string; value: string }) {
  return (
    <View style={s.fieldBox}>
      <Text style={s.label}>{en.toUpperCase()} / {fr.toUpperCase()}</Text>
      <Text style={s.value}>{value || '—'}</Text>
    </View>
  );
}

export function PassportCardPDF({
  fields,
  photoDataUrl,
  code,
  qrDataUrl,
  baseUrl,
}: {
  fields: PassportFields;
  photoDataUrl: string | null;
  code: string;
  qrDataUrl: string;
  baseUrl: string;
}) {
  registerFonts(baseUrl);
  return (
    <Document>
      <Page size={[W, H]} style={s.page}>
        <View style={s.border} />
        <Text style={s.watermark}>FICTIONAL MEMBER ID</Text>
        <Text style={s.headerTitle}>EPRIS JOURNAL</Text>
        <Text style={s.headerSub}>DIGITAL MEMBER PASSPORT · PASSEPORT NUMÉRIQUE DE MEMBRE</Text>
        <View style={s.banner}>
          <Text style={s.bannerText}>NOT A GOVERNMENT DOCUMENT · FICTIONAL MEMBER ID · EPRIS JOURNAL ONLY</Text>
        </View>
        <View style={s.body}>
          {photoDataUrl ? <Image src={photoDataUrl} style={s.photo} /> : <View style={s.photo} />}
          <View style={{ flex: 1 }}>
            <View style={s.fieldsCol}>
              <FieldPDF en="Surname" fr="Nom" value={fields.surname.toUpperCase()} />
              <FieldPDF en="Given Names" fr="Prénoms" value={fields.givenNames.toUpperCase()} />
              <FieldPDF en="Member No." fr="N° d'adhérent" value={code} />
              <FieldPDF en="Membership Type" fr="Type d'adhésion" value={fields.membershipType} />
              <FieldPDF en="Country" fr="Pays" value={fields.country} />
              <FieldPDF en="City" fr="Ville" value={fields.city} />
              <FieldPDF en="Date of Birth" fr="Date de naissance" value={fields.dob} />
              <FieldPDF en="Field" fr="Domaine" value={fields.field} />
              <FieldPDF en="Issue Date" fr="Date d'émission" value={fields.issueDate} />
              <FieldPDF en="Expiry Date" fr="Date d'expiration" value={fields.expiryDate} />
              <FieldPDF en="Issuing Authority" fr="Autorité de délivrance" value="EPRIS JOURNAL" />
            </View>
            {fields.motto ? <Text style={s.motto}>“{fields.motto}”</Text> : null}
          </View>
          <View style={{ alignItems: 'center' }}>
            <Image src={qrDataUrl} style={s.qr} />
            <Text style={s.qrCaption}>SCAN TO VERIFY</Text>
          </View>
        </View>
        <View style={s.sigBox}>
          <Text style={s.sigText}>{generateSignatureString(code, fields)}</Text>
        </View>
      </Page>
    </Document>
  );
}
