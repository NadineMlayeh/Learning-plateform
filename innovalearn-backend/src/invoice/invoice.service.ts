import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import PDFDocument from 'pdfkit';
import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  private ensureDir() {
    mkdirSync(join(process.cwd(), 'uploads', 'invoices'), {
      recursive: true,
    });
  }

  private finalizePdf(doc: PDFKit.PDFDocument, filePath: string) {
    return new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(filePath);
      stream.on('finish', () => resolve());
      stream.on('error', (err) => reject(err));
      doc.pipe(stream);
      doc.end();
    });
  }

  async generateInvoice(enrollmentId: number) {
    const existing = await this.prisma.invoice.findUnique({
      where: { enrollmentId },
    });

    if (existing) {
      return existing;
    }

    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        student: true,
        formation: true,
      },
    });

    if (!enrollment) {
      throw new BadRequestException('Enrollment not found');
    }

    if (enrollment.status !== 'APPROVED') {
      throw new BadRequestException(
        'Invoice can only be generated for approved enrollments',
      );
    }

    this.ensureDir();

    const fileName = `invoice-${uuidv4()}.pdf`;
    const filePath = join(process.cwd(), 'uploads/invoices', fileName);

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    const issueDate = new Date();
    const amount = Number(enrollment.formation.price);
    const amountFormatted = `${amount.toFixed(2)} EUR`;

    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f7faff');

    doc.rect(0, 0, doc.page.width, 132).fill('#0e4a8a');

    doc
      .fillColor('#ffffff')
      .fontSize(27)
      .font('Helvetica-Bold')
      .text('INVOICE', 52, 42);

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#dbe9fb')
      .text(`Invoice ID: ${fileName.replace('.pdf', '')}`, 52, 82)
      .text(`Issued: ${issueDate.toLocaleDateString()}`, 52, 98);

    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .text('InnovaLearn', 392, 44, { align: 'right', width: 160 });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#dbe9fb')
      .text('Training and learning platform', 392, 63, {
        align: 'right',
        width: 160,
      })
      .text('support@innovalearn.local', 392, 78, {
        align: 'right',
        width: 160,
      });

    doc.roundedRect(44, 150, 250, 112, 10).fillAndStroke('#ffffff', '#d2e2f7');
    doc.roundedRect(304, 150, 248, 112, 10).fillAndStroke('#ffffff', '#d2e2f7');

    doc
      .font('Helvetica-Bold')
      .fillColor('#194a7f')
      .fontSize(11)
      .text('Billed To', 58, 167)
      .text('Training Details', 318, 167);

    doc
      .font('Helvetica')
      .fillColor('#264d77')
      .fontSize(10.5)
      .text(`Student: ${enrollment.student.name}`, 58, 188)
      .text(`Email: ${enrollment.student.email}`, 58, 205)
      .text(`Student ID: ${enrollment.student.id}`, 58, 222);

    doc
      .text(`Formation: ${enrollment.formation.title}`, 318, 188)
      .text(`Type: ${enrollment.formation.type}`, 318, 205)
      .text(`Enrollment ID: ${enrollment.id}`, 318, 222);

    doc.roundedRect(44, 290, 508, 34, 8).fill('#0f62b2');

    doc
      .font('Helvetica-Bold')
      .fillColor('#ffffff')
      .fontSize(10.5)
      .text('Description', 58, 302)
      .text('Unit Price', 398, 302, { width: 80, align: 'right' })
      .text('Amount', 480, 302, { width: 58, align: 'right' });

    doc.roundedRect(44, 324, 508, 58, 8).fillAndStroke('#ffffff', '#d2e2f7');

    doc
      .font('Helvetica')
      .fillColor('#1c4f83')
      .fontSize(10.5)
      .text(`Enrollment fee - ${enrollment.formation.title}`, 58, 345)
      .text(amountFormatted, 398, 345, { width: 80, align: 'right' })
      .text(amountFormatted, 480, 345, { width: 58, align: 'right' });

    doc.roundedRect(332, 402, 220, 98, 10).fillAndStroke('#ffffff', '#d2e2f7');

    doc
      .font('Helvetica')
      .fillColor('#214f7e')
      .fontSize(10.5)
      .text('Subtotal', 346, 424)
      .text(amountFormatted, 458, 424, { width: 80, align: 'right' })
      .text('Tax', 346, 444)
      .text('0.00 EUR', 458, 444, { width: 80, align: 'right' });

    doc
      .moveTo(344, 463)
      .lineTo(542, 463)
      .strokeColor('#d3e1f3')
      .lineWidth(1)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fillColor('#0f4d8f')
      .fontSize(12)
      .text('Total Paid', 346, 472)
      .text(amountFormatted, 458, 472, { width: 80, align: 'right' });

    doc
      .font('Helvetica')
      .fillColor('#476b91')
      .fontSize(9.8)
      .text(
        'Thank you for your payment. Keep this invoice for your records.',
        44,
        544,
      )
      .text('This invoice was generated automatically by InnovaLearn.', 44, 560);

    await this.finalizePdf(doc, filePath);

    return this.prisma.invoice.create({
      data: {
        studentId: enrollment.studentId,
        enrollmentId,
        amount,
        pdfUrl: `/uploads/invoices/${fileName}`,
      },
    });
  }

  async getStudentInvoices(studentId: number) {
    return this.prisma.invoice.findMany({
      where: { studentId },
      include: {
        enrollment: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            formation: {
              select: {
                id: true,
                title: true,
                type: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminInvoices() {
    return this.prisma.invoice.findMany({
      where: {
        enrollment: {
          status: 'APPROVED',
        },
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        enrollment: {
          select: {
            id: true,
            createdAt: true,
            status: true,
            formation: {
              select: {
                id: true,
                title: true,
                type: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
