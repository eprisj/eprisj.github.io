import React from 'react';
import { Document, Page, View, Text, Image, StyleSheet, Font, Svg, Path, Circle, Defs, LinearGradient, Stop, Rect, Polygon, Line, Ellipse } from '@react-pdf/renderer';
import type { PassportFields } from './passportRender';
import { generateSignatureString } from '../../lib/passportCode';
import { buildMRZ } from '../../lib/mrz';

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

// MRZ generation lives in ../../lib/mrz (single shared ICAO 9303 implementation).

// Aspect ratio 88:125 -> let's use 316.8 x 450 (which is 88*3.6, 125*3.6)
const W = 316.8;
const H = 450;
const c = { 
  burgundy: '#4a1728', 
  burgundyDark: '#36111d',
  cream: '#f5eddc', 
  sand: '#b8956e', 
  ink: '#1a0b10',
  bg1: '#f5eddc',
  bg2: '#ede1c6',
  bg3: '#e7d8b8'
};

const s = StyleSheet.create({
  page: { width: W, height: H, backgroundColor: c.bg2, position: 'relative' },
  outerFrame: { position: 'absolute', top: 5, left: 5, right: 5, bottom: 5, borderWidth: 1.5, borderColor: c.burgundy, opacity: 0.82 },
  innerFrame: { position: 'absolute', top: 9, left: 9, right: 9, bottom: 9, borderWidth: 0.7, borderColor: c.sand, opacity: 0.55 },
  header: { 
    position: 'absolute', top: 5, left: 5, right: 5, height: 28,
    backgroundColor: c.burgundy, 
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
  },
  headerTitle: { fontFamily: 'PTSerifBold', fontSize: 11, color: c.cream, letterSpacing: 1.5 },
  headerSub: { fontFamily: 'PTSans', fontSize: 4, color: c.cream, opacity: 0.7, letterSpacing: 0.8, marginTop: 1 },
  microText: { 
    position: 'absolute', top: 35, left: 12, right: 12, 
    fontFamily: 'PTSans', fontSize: 3, color: c.burgundy, opacity: 0.3, letterSpacing: 1 
  },
  contentArea: { position: 'absolute', top: 75, left: 12, right: 12, bottom: 55, flexDirection: 'row' },
  photoBox: { width: 90, height: 115.7, borderWidth: 1.2, borderColor: c.burgundy, backgroundColor: '#f8f4ed' },
  photo: { width: '100%', height: '100%', objectFit: 'cover' },
  qrBox: { width: 90, height: 115.7, borderWidth: 1.2, borderColor: c.burgundy, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 4 },
  qr: { width: '100%', height: '100%', objectFit: 'contain' },
  typeRow: { position: 'absolute', top: 42, left: 15, right: 15, flexDirection: 'row' },
  fieldsCol: { flex: 1, marginLeft: 12, justifyContent: 'space-between' },
  field: { marginBottom: 2 },
  label: { fontFamily: 'PTSerifItalic', fontSize: 5, color: c.burgundy, opacity: 0.65 },
  val: { fontFamily: 'PTSerifBold', fontSize: 8.5, color: c.ink, marginTop: 1 },
  valMono: { fontFamily: 'PTSansBold', fontSize: 7, color: c.ink, marginTop: 1, letterSpacing: 0.5 },
  valBig: { fontFamily: 'PTSerifBold', fontSize: 11, color: c.ink, marginTop: 1 },
  mrzArea: { position: 'absolute', bottom: 6, left: 12, right: 12 },
  mrzLabel: { fontFamily: 'PTSans', fontSize: 4, color: c.burgundy, opacity: 0.5, letterSpacing: 1, marginBottom: 2 },
  mrzBox: { backgroundColor: 'rgba(255,255,255,0.85)', borderWidth: 0.5, borderColor: 'rgba(74,23,40,0.2)', padding: 6 },
  mrzText: { fontFamily: 'Courier-Bold', fontSize: 10, color: c.ink, opacity: 0.9, letterSpacing: 0.6, lineHeight: 1.3 },
  pageNo: { position: 'absolute', bottom: 3, right: 12, fontFamily: 'PTSans', fontSize: 4, color: c.burgundy, opacity: 0.4 },
  hologram: { position: 'absolute', bottom: 50, left: 12, right: 12, height: 3, backgroundColor: 'rgba(100, 160, 240, 0.2)' },
  sealArea: { position: 'absolute', bottom: 55, left: 12, right: 12, height: 50, alignItems: 'center', justifyContent: 'center', opacity: 0.15 },
  watermark: { position: 'absolute', top: 180, left: 20, fontFamily: 'PTSerifBold', fontSize: 60, color: c.burgundy, opacity: 0.04, transform: 'rotate(-16deg)' },
  overlay: { position: 'absolute', top: 75, left: 12, right: 12, bottom: 55, backgroundColor: 'rgba(245,237,220,0.4)' },
});

// Simplified Guilloche for PDF rendering performance
function GuillochePDF() {
  const paths: string[] = [];
  for (let i = 0; i <= 20; i++) {
    const y = (i / 20) * 100;
    const a = 2.0;
    let d = '';
    for (let x = 0; x <= 100; x += 2) {
      const yy = y + a * Math.sin(x * 0.1 + i * 0.68);
      d += x === 0 ? `M${x},${yy}` : `L${x},${yy}`;
    }
    paths.push(d);
  }
  for (let i = 0; i <= 15; i++) {
    const x = (i / 15) * 100;
    const a = 1.5;
    let d = '';
    for (let y = 0; y <= 100; y += 2) {
      const xx = x + a * Math.sin(y * 0.1 + i * 0.5);
      d += y === 0 ? `M${xx},${y}` : `L${xx},${y}`;
    }
    paths.push(d);
  }
  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.15 }}>
      <Svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <Defs>
          <LinearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#8B5A2B"/>
            <Stop offset="50%" stopColor="#3d5a8a"/>
            <Stop offset="100%" stopColor="#5a3870"/>
          </LinearGradient>
        </Defs>
        {paths.map((d, i) => <Path key={i} d={d} stroke="url(#g)" strokeWidth={0.2} fill="none" />)}
      </Svg>
    </View>
  );
}

function F({ label, val, big, mono }: { label: string; val: string; big?: boolean; mono?: boolean }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <Text style={big ? s.valBig : mono ? s.valMono : s.val}>{val || '—'}</Text>
    </View>
  );
}

export function PassportCardPDF({ fields, photoDataUrl, code, qrDataUrl, baseUrl }: { fields: PassportFields; photoDataUrl: string | null; code: string; qrDataUrl: string; baseUrl: string; }) {
  registerFonts(baseUrl);
  const mrz = buildMRZ(fields, code);
  
  return (
    <Document>
      {/* Page 1 */}
      <Page size={[W, H]} style={s.page}>
        <GuillochePDF />
        <Text style={s.watermark}>EPRIS</Text>
        <View style={s.outerFrame} />
        <View style={s.innerFrame} />
        
        <View style={s.header}>
          <Text style={s.headerTitle}>EPRIS JOURNAL</Text>
          <Text style={s.headerSub}>DIGITAL MEMBER PASSPORT</Text>
        </View>
        
        <Text style={s.microText}>{'EPRIS JOURNAL · REVEAL THE INVISIBLE · '.repeat(10)}</Text>
        
        <View style={s.typeRow}>
          <View style={{ width: '25%' }}><F label="Type" val="P" /></View>
          <View style={{ width: '25%' }}><F label="Code" val="EPR" /></View>
          <View style={{ width: '50%' }}><F label="Member No." val={code} mono /></View>
        </View>
        <View style={{ position: 'absolute', top: 70, left: 12, right: 12, height: 0.5, backgroundColor: c.sand, opacity: 0.5 }} />
        
        <View style={s.overlay} />
        <View style={s.contentArea}>
          <View style={{ width: 90 }}>
            <View style={s.photoBox}>
              {photoDataUrl ? <Image src={photoDataUrl} style={s.photo} /> : null}
            </View>
            <View style={{ marginTop: 8, padding: 4, backgroundColor: 'rgba(74,23,40,0.06)', borderWidth: 0.5, borderColor: 'rgba(74,23,40,0.18)' }}>
              <Text style={{ fontFamily: 'PTSans', fontSize: 3.5, color: c.burgundy, opacity: 0.5, textAlign: 'center' }}>MEMBERSHIP TYPE</Text>
              <Text style={{ fontFamily: 'PTSerifBold', fontSize: 6, color: c.burgundy, textAlign: 'center', marginTop: 2 }}>{fields.membershipType || 'Author'}</Text>
            </View>
          </View>
          
          <View style={s.fieldsCol}>
            <F label="Surname" val={fields.surname.toUpperCase()} big />
            <F label="Given Names" val={fields.givenNames.toUpperCase()} big />
            <F label="Nationality" val={`EPRIS · ${fields.country || '—'}`.toUpperCase()} />
            
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><F label="Date of birth" val={fields.dob} /></View>
              <View style={{ flex: 1 }}><F label="Record No." val={code} mono /></View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><F label="Sex" val={(fields.sex || 'X').toUpperCase()} /></View>
              <View style={{ flex: 1 }}><F label="City" val={fields.city} /></View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><F label="Date of issue" val={fields.issueDate} /></View>
              <View style={{ flex: 1 }}><F label="Authority" val="EPRIS J." /></View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><F label="Date of expiry" val={fields.expiryDate} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>Holder's signature</Text>
                <View style={{ borderBottomWidth: 0.7, borderBottomColor: c.sand, width: '80%', height: 12, marginTop: 2 }} />
              </View>
            </View>
            <F label="Professional Field" val={(fields.field || '—').toUpperCase()} />
          </View>
        </View>
        
        <View style={s.sealArea}>
          <Svg viewBox="0 0 100 100" style={{ width: 50, height: 50 }}>
            <Circle cx="50" cy="50" r="48" fill="none" stroke={c.burgundy} strokeWidth="1" />
            <Circle cx="50" cy="50" r="40" fill="none" stroke={c.sand} strokeWidth="0.8" />
            <Circle cx="50" cy="50" r="30" fill="none" stroke={c.burgundy} strokeWidth="0.8" />
            <Circle cx="50" cy="50" r="10" fill="none" stroke={c.burgundy} strokeWidth="1" />
          </Svg>
        </View>
        
        <View style={s.hologram} />
        
        <View style={s.mrzArea}>
          <Text style={s.mrzLabel}>MACHINE READABLE ZONE</Text>
          <View style={s.mrzBox}>
            <Text style={s.mrzText}>{mrz[0]}</Text>
            <Text style={s.mrzText}>{mrz[1]}</Text>
          </View>
        </View>
        <Text style={s.pageNo}>2 / 32</Text>
      </Page>
      
      {/* Page 2 */}
      <Page size={[W, H]} style={s.page}>
        <GuillochePDF />
        <Text style={s.watermark}>EPRIS</Text>
        <View style={s.outerFrame} />
        <View style={s.innerFrame} />
        
        <View style={s.header}>
          <Text style={s.headerTitle}>EPRIS JOURNAL</Text>
          <Text style={s.headerSub}>OBSERVATIONS</Text>
        </View>
        
        <Text style={s.microText}>{'EPRIS JOURNAL · REVEAL THE INVISIBLE · '.repeat(10)}</Text>
        
        <View style={s.overlay} />
        <View style={{ position: 'absolute', top: 45, left: 12, right: 12, bottom: 20, flexDirection: 'row' }}>
          <View style={{ width: 90 }}>
            <View style={s.qrBox}>
              {qrDataUrl ? <Image src={qrDataUrl} style={s.qr} /> : null}
            </View>
          </View>
          
          <View style={s.fieldsCol}>
            <F label="Personal Motto" val={fields.motto} big />
            <F label="Website · ORCID · Social" val={fields.link} />
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}><F label="Membership Type" val={fields.membershipType} /></View>
              <View style={{ flex: 1 }}><F label="Verification" val={code} mono /></View>
            </View>
            <F label="Digital Signature" val={generateSignatureString(code, fields)} mono />
            <F label="Scan to Verify" val={`eprisjournal.com/passport/${code}`} />
            
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.15 }}>
              <Svg viewBox="0 0 100 60" style={{ width: 80, height: 48 }}>
                <Ellipse cx="50" cy="30" rx="48" ry="28" stroke={c.burgundy} strokeWidth="1" fill="none"/>
                <Ellipse cx="50" cy="30" rx="42" ry="22" stroke={c.burgundy} strokeWidth="0.5" fill="none"/>
              </Svg>
            </View>
          </View>
        </View>
        <Text style={s.pageNo}>3 / 32</Text>
      </Page>
    </Document>
  );
}
