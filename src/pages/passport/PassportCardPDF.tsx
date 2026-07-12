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

// Portrait passport-page proportions — each page of the spread is its own
// PDF page (two pages, printed/viewed as a two-page booklet).
const W = 420;
const H = 540;

const s = StyleSheet.create({
  page: { width: W, height: H, backgroundColor: c.cream, padding: 26, position: 'relative' },
  border: { position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, borderWidth: 2, borderColor: c.burgundy },
  border2: { position: 'absolute', top: 15, left: 15, right: 15, bottom: 15, borderWidth: 1, borderColor: c.sand },
  headerTitle: { fontFamily: 'PTSerifBold', fontSize: 19, color: c.burgundy },
  headerSub: { fontFamily: 'PTSans', fontSize: 7, color: c.burgundy, opacity: 0.8, marginTop: 2, letterSpacing: 0.5 },
  banner: { backgroundColor: c.burgundy, paddingVertical: 6, marginTop: 10, marginBottom: 14 },
  bannerText: { fontFamily: 'PTSansBold', fontSize: 7.5, color: c.cream, textAlign: 'center', letterSpacing: 0.4 },
  body: { flexDirection: 'row', gap: 14 },
  photo: { width: 110, height: 147, objectFit: 'cover', borderWidth: 2, borderColor: c.burgundy },
  fieldsCol: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  fieldBox: { width: '50%', marginBottom: 12 },
  fieldBoxFull: { width: '100%', marginBottom: 12 },
  label: { fontFamily: 'PTSans', fontSize: 6, color: c.burgundy, opacity: 0.7, letterSpacing: 0.4 },
  value: { fontFamily: 'PTSerifBold', fontSize: 11.5, color: c.ink, marginTop: 2 },
  motto: { fontFamily: 'PTSerifItalic', fontSize: 12, color: c.burgundy, textAlign: 'center' },
  qrBox: { width: 110, height: 147, borderWidth: 2, borderColor: c.burgundy, alignItems: 'center', justifyContent: 'center', padding: 8 },
  qr: { width: '100%', height: '100%', objectFit: 'contain' },
  watermark: { position: 'absolute', top: 220, left: 60, fontFamily: 'PTSansBold', fontSize: 26, color: c.burgundy, opacity: 0.1, transform: 'rotate(-16deg)' },
  authorityBox: { position: 'absolute', bottom: 60, left: 26, right: 26, borderTopWidth: 1, borderTopColor: c.sand, paddingTop: 8 },
  verifyBox: { marginTop: 16 },
});

function FieldPDF({ en, fr, value, full }: { en: string; fr: string; value: string; full?: boolean }) {
  return (
    <View style={full ? s.fieldBoxFull : s.fieldBox}>
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
      {/* Page 1 — bio data page */}
      <Page size={[W, H]} style={s.page}>
        <View style={s.border} />
        <View style={s.border2} />
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
              <FieldPDF full en="Surname" fr="Nom" value={fields.surname.toUpperCase()} />
              <FieldPDF full en="Given Names" fr="Prénoms" value={fields.givenNames.toUpperCase()} />
              <FieldPDF en="Member No." fr="N° d'adhérent" value={code} />
              <FieldPDF en="Membership Type" fr="Type d'adhésion" value={fields.membershipType} />
              <FieldPDF en="Country" fr="Pays" value={fields.country} />
              <FieldPDF en="City" fr="Ville" value={fields.city} />
            </View>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 16 }}>
          <FieldPDF en="Date of Birth" fr="Date de naissance" value={fields.dob} />
          <FieldPDF en="Field" fr="Domaine" value={fields.field} />
          <FieldPDF en="Issue Date" fr="Date d'émission" value={fields.issueDate} />
          <FieldPDF en="Expiry Date" fr="Date d'expiration" value={fields.expiryDate} />
        </View>
        <View style={s.authorityBox}>
          <Text style={s.label}>ISSUING AUTHORITY / AUTORITÉ DE DÉLIVRANCE</Text>
          <Text style={s.value}>EPRIS JOURNAL</Text>
        </View>
      </Page>

      {/* Page 2 — observations page, mirrors page 1's layout */}
      <Page size={[W, H]} style={s.page}>
        <View style={s.border} />
        <View style={s.border2} />
        <Text style={s.watermark}>FICTIONAL MEMBER ID</Text>
        <Text style={s.headerTitle}>EPRIS JOURNAL</Text>
        <Text style={s.headerSub}>OBSERVATIONS · MENTIONS SPÉCIALES</Text>
        <View style={s.banner}>
          <Text style={s.bannerText}>NOT A GOVERNMENT DOCUMENT · FICTIONAL MEMBER ID · EPRIS JOURNAL ONLY</Text>
        </View>
        <View style={s.body}>
          <View style={s.qrBox}>
            <Image src={qrDataUrl} style={s.qr} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.fieldsCol}>
              <FieldPDF full en="Personal Motto" fr="Devise personnelle" value={fields.motto} />
              <FieldPDF full en="Website / ORCID / Social" fr="Site web / ORCID / Réseau" value={fields.link} />
              <FieldPDF en="Membership Type" fr="Type d'adhésion" value={fields.membershipType} />
              <FieldPDF en="Verification Code" fr="Code de vérification" value={code} />
            </View>
          </View>
        </View>
        <View style={{ marginTop: 16 }}>
          <FieldPDF full en="Digital Signature" fr="Signature numérique" value={generateSignatureString(code, fields)} />
        </View>
        <View style={s.authorityBox}>
          <Text style={s.label}>SCAN TO VERIFY / SCANNER POUR VÉRIFIER</Text>
          <Text style={s.value}>eprisjournal.com/passport/{code}</Text>
        </View>
      </Page>
    </Document>
  );
}
