import ReactPDF from '@react-pdf/renderer';
import React from 'react';
import { MagazinePDF } from '../src/pages/MagazinePDF';
import { getIssue, translations } from '../src/data';

const lang = process.argv[2] || 'EN';
const t = (key: string) =>
  (translations as Record<string, Record<string, string>>)[lang]?.[key] ||
  translations['EN']?.[key] ||
  key;

const { issue, articles } = getIssue(lang);
// Local public dir so fonts + /images resolve from disk during the test render
// (cover images use absolute GitHub URLs and still fetch remotely).
const baseUrl = process.env.BASE_URL || `${process.cwd()}/public`;

const out = `/tmp/epris_${lang}.pdf`;
await ReactPDF.renderToFile(
  React.createElement(MagazinePDF, { issue, articles, baseUrl, t }) as never,
  out
);
console.log('Rendered', out, '· articles:', articles.map((a) => a.id).join(','));
