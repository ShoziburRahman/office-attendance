import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildMonthlyReportData } from "@/lib/reports/report-data-builder";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, TextRun, AlignmentType, HeadingLevel, PageBreak } from "docx";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const month = parseInt(searchParams.get("month") || "0");
    const year = parseInt(searchParams.get("year") || "0");
    const format = searchParams.get("format");

    if (!employeeId || isNaN(month) || isNaN(year) || !format) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Verify Admin Role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if ((profile as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const reportData = await buildMonthlyReportData(employeeId, month, year);
    const monthName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(new Date(year, month - 1));
    const sanitizedName = reportData.employee.full_name.replace(/[^a-z0-9]/gi, '_');
    const fileName = `${sanitizedName}_${monthName}_${year}_Attendance_History`;

    if (format === "pdf") {
      const doc = new jsPDF();

      // Header
      doc.setFontSize(18);
      doc.text("Monthly Attendance History", 105, 20, { align: "center" });

      doc.setFontSize(10);
      doc.text(`Employee: ${reportData.employee.full_name} (${reportData.employee.employee_code})`, 14, 30);
      doc.text(`Position: ${reportData.employee.position} | Dept: ${reportData.employee.department}`, 14, 35);
      doc.text(`Period: ${monthName} ${year}`, 14, 40);

      // Summary
      doc.setFontSize(12);
      doc.text("Monthly Summary", 14, 50);
      docC_autoTable(doc, reportData);

      // Table
      doc.setFontSize(12);
      doc.text("Daily Attendance Details", 14, (doc as any).lastAutoTable.finalY + 10);

      const tableData = reportData.dailyDetails.map(d => [
        d.date, d.day, d.status, d.checkIn || "-", d.checkOut || "-", d.duration || "-", d.lateMinutes, d.overtime
      ]);

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Date', 'Day', 'Status', 'In', 'Out', 'Dur', 'Late', 'OT']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [100, 100, 100] },
        styles: { fontSize: 8 },
      });

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename=${fileName}.pdf`,
        },
      });
    } else if (format === "docx") {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ text: "Monthly Attendance History", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
            new Paragraph({ text: `Employee: ${reportData.employee.full_name} (${reportData.employee.employee_code})`, spacing: { before: 400 } }),
            new Paragraph({ text: `Position: ${reportData.employee.position} | Dept: ${reportData.employee.department}` }),
            new Paragraph({ text: `Period: ${monthName} ${year}` }),
            new Paragraph({ text: "Monthly Summary", heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Total Working Days")] }),
                    new TableCell({ children: [new Paragraph(reportData.summary.totalWorkingDays.toString())] }),
                  ],
                }),
                // ... other summary rows
              ],
            }),
            new Paragraph({ text: "Daily Attendance Details", heading: HeadingLevel.HEADING_2, spacing: { before: 400 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph("Date")] }),
                    new TableCell({ children: [new Paragraph("Day")] }),
                    new TableCell({ children: [new Paragraph("Status")] }),
                    new TableCell({ children: [new Paragraph("In")] }),
                    new TableCell({ children: [new Paragraph("Out")] }),
                    new TableCell({ children: [new Paragraph("Dur")] }),
                  ],
                }),
                ...reportData.dailyDetails.map(d => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(d.date)] }),
                    new TableCell({ children: [new Paragraph(d.day)] }),
                    new TableCell({ children: [new Paragraph(d.status)] }),
                    new TableCell({ children: [new Paragraph(d.checkIn || "-")] }),
                    new TableCell({ children: [new Paragraph(d.checkOut || "-")] }),
                    new TableCell({ children: [new Paragraph(d.duration || "-")] }),
                  ],
                })),
              ],
            }),
          ],
        }],
      });

      const docxBuffer = await Packer.toBuffer(doc);
      return new NextResponse(new Uint8Array(docxBuffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename=${fileName}.docx`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (e: any) {
    console.error("Report generation error:", e);
    return NextResponse.json({ error: e.message || "Internal server error" }, { status: 500 });
  }
}

// Helper for summary table in PDF
function docC_autoTable(doc: any, data: any) {
  autoTable(doc, {
    startY: 45,
    head: [['Metric', 'Value']],
    body: [
      ['Total Working Days', data.summary.totalWorkingDays],
      ['Days Worked', data.summary.daysWorked],
      ['Present Days', data.summary.presentDays],
      ['Paid Leave', data.summary.paidLeaveDays],
      ['Unpaid Leave', data.summary.unpaidLeaveDays],
      ['Weekly Offs', data.summary.weeklyOffs],
      ['Total Late Minutes', data.summary.totalLateMinutes],
      ['Total Overtime', data.summary.totalOvertime],
      ['Total Working Hours', data.summary.totalWorkingHours],
    ],
    theme: 'striped',
    styles: { fontSize: 10 },
  });
}
