import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CertificateService {
  private ensureDirs() {
    mkdirSync(join(process.cwd(), 'uploads', 'badges'), { recursive: true });
    mkdirSync(join(process.cwd(), 'uploads', 'certificates'), { recursive: true });
  }

  private finalizePdf(doc: PDFKit.PDFDocument, filePath: string) {
    return new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(filePath);
      stream.on('finish', () => resolve());
      stream.on('error', (error) => reject(error));
      doc.pipe(stream);
      doc.end();
    });
  }

  /* ============================================================
     🏅 BADGE DESIGN — Modern EdTech Style
     ============================================================ */
  async generateBadge(
    studentName: string,
    formationTitle: string,
    courseTitle: string,
  ) {
    this.ensureDirs();

    const fileName = `badge-${uuidv4()}.pdf`;
    const filePath = join(process.cwd(), 'uploads/badges', fileName);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const width = doc.page.width;
    const height = doc.page.height;

    /* ---------- Background (Simulated Gradient) ---------- */
    doc.rect(0, 0, width, height).fill('#0b1e3c');

    doc.save().opacity(0.9);
    doc.polygon([0, 0], [width * 0.6, 0], [width * 0.4, height], [0, height]).fill('#1e63ff');
    doc.restore();

    doc.save().opacity(0.85);
    doc.polygon([width * 0.4, 0], [width, 0], [width, height], [width * 0.6, height]).fill('#ff3b3b');
    doc.restore();

    doc.save().opacity(0.15);
    doc.circle(width / 2, height / 2, 280).fill('#ffd93b');
    doc.restore();

    /* ---------- White Card ---------- */
    doc.roundedRect(70, 60, width - 140, height - 120, 16).fill('#ffffff');

    /* ---------- Branding ---------- */
    doc.fillColor('#1e63ff')
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('INNOVALEARN', 90, 90);

    doc.fillColor('#8892a6')
      .fontSize(12)
      .text('Digital Learning Platform', 90, 118);

    /* ---------- Title ---------- */
    doc.fillColor('#111827')
      .fontSize(40)
      .font('Helvetica-Bold')
      .text('COURSE BADGE', 0, 160, { align: 'center' });

    doc.moveTo(width / 2 - 120, 210)
      .lineTo(width / 2 + 120, 210)
      .lineWidth(3)
      .stroke('#ffd93b');

    /* ---------- Student ---------- */
    doc.fillColor('#6b7280')
      .fontSize(18)
      .font('Helvetica')
      .text('Awarded to', 0, 240, { align: 'center' });

    doc.fillColor('#1e3a8a')
      .fontSize(34)
      .font('Helvetica-Bold')
      .text(studentName, 0, 270, { align: 'center' });

    /* ---------- Course ---------- */
    doc.fillColor('#374151')
      .fontSize(18)
      .text('For successfully completing', 0, 320, { align: 'center' });

    doc.fillColor('#ef4444')
      .fontSize(26)
      .font('Helvetica-Bold')
      .text(courseTitle, 100, 350, {
        width: width - 200,
        align: 'center',
      });

    doc.fillColor('#6b7280')
      .fontSize(15)
      .font('Helvetica')
      .text(`Formation: ${formationTitle}`, 0, 390, { align: 'center' });

    /* ---------- Verification Seal ---------- */
    doc.circle(width - 160, height - 150, 45).fill('#ffd93b');

    doc.fillColor('#111827')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('VERIFIED', width - 200, height - 155, {
        width: 80,
        align: 'center',
      });

    /* ---------- Footer ---------- */
    doc.fillColor('#9ca3af')
      .fontSize(12)
      .text(`Issued on ${new Date().toDateString()}`, 90, height - 100);

    doc.moveTo(90, height - 120)
      .lineTo(260, height - 120)
      .stroke('#1e63ff');

    doc.fontSize(10).text('InnovaLearn Certification', 90, height - 135);

    await this.finalizePdf(doc, filePath);
    return `/uploads/badges/${fileName}`;
  }

  /* ============================================================
     🎓 CERTIFICATE DESIGN — Premium Look
     ============================================================ */
  async generateCertificate(studentName: string, formationTitle: string) {
    this.ensureDirs();

    const fileName = `certificate-${uuidv4()}.pdf`;
    const filePath = join(process.cwd(), 'uploads/certificates', fileName);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const width = doc.page.width;
    const height = doc.page.height;

    /* ---------- Background ---------- */
    doc.rect(0, 0, width, height).fill('#0b1e3c');

    doc.save().opacity(0.95);
    doc.rect(0, 0, width, height * 0.55).fill('#1e63ff');
    doc.restore();

    doc.save().opacity(0.85);
    doc.rect(0, height * 0.55, width, height).fill('#ff3b3b');
    doc.restore();

    doc.save().opacity(0.12);
    doc.circle(width / 2, height / 2, 320).fill('#ffd93b');
    doc.restore();

    /* ---------- Certificate Panel ---------- */
    doc.roundedRect(60, 50, width - 120, height - 100, 20).fill('#ffffff');

    doc.roundedRect(75, 65, width - 150, height - 130, 16)
      .lineWidth(2)
      .stroke('#1e63ff');

    /* ---------- Brand ---------- */
    doc.fillColor('#1e63ff')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('INNOVALEARN', 0, 95, { align: 'center' });

    doc.fillColor('#9ca3af')
      .fontSize(12)
      .text('Empowering Future Innovators', 0, 125, { align: 'center' });

    /* ---------- Title ---------- */
    doc.fillColor('#111827')
      .fontSize(42)
      .font('Helvetica-Bold')
      .text('CERTIFICATE OF COMPLETION', 0, 170, { align: 'center' });

    doc.moveTo(width / 2 - 150, 230)
      .lineTo(width / 2 + 150, 230)
      .lineWidth(4)
      .stroke('#ffd93b');

    /* ---------- Body ---------- */
    doc.fillColor('#6b7280')
      .fontSize(20)
      .text('This certifies that', 0, 260, { align: 'center' });

    doc.fillColor('#1e3a8a')
      .fontSize(38)
      .font('Helvetica-Bold')
      .text(studentName, 100, 300, {
        width: width - 200,
        align: 'center',
      });

    doc.fillColor('#374151')
      .fontSize(20)
      .font('Helvetica')
      .text('has successfully completed the formation', 0, 360, {
        align: 'center',
      });

    doc.fillColor('#ef4444')
      .fontSize(30)
      .font('Helvetica-Bold')
      .text(formationTitle, 120, 395, {
        width: width - 240,
        align: 'center',
      });

    /* ---------- Signature ---------- */
    doc.moveTo(width / 2 - 120, height - 140)
      .lineTo(width / 2 + 120, height - 140)
      .stroke('#1e63ff');

    doc.fillColor('#6b7280')
      .fontSize(12)
      .text('Authorized by InnovaLearn', 0, height - 130, { align: 'center' });

    doc.fillColor('#9ca3af')
      .fontSize(12)
      .text(`Issued on ${new Date().toDateString()}`, 0, height - 100, {
        align: 'center',
      });

    /* ---------- Official Seal ---------- */
    doc.circle(width - 150, height - 150, 50).fill('#ffd93b');

    doc.fillColor('#111827')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('OFFICIAL', width - 190, height - 155, {
        width: 80,
        align: 'center',
      });

    await this.finalizePdf(doc, filePath);
    return `/uploads/certificates/${fileName}`;
  }
}
