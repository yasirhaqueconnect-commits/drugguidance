"""
Clinical Consultation Audit & Export Service.
Generates publication-quality PDF reports (using ReportLab) and formatted CSV audit files.
"""

import io
import re
import csv
import html
from typing import Any, List, Optional, Dict

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors


def format_markdown_for_csv(text: str) -> str:
    """Strips markdown asterisks and cleans bullet characters for Microsoft Excel compatibility."""
    if not text:
        return ""
    # Strip bold markdown asterisks: **text** -> text
    clean = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    # Strip single asterisks or italics: *text* -> text
    clean = re.sub(r'(?<!\*)\*(?!\s)(.+?)(?!\s)(?<!\*)\*', r'\1', clean)
    # Clean bullet markers at line starts to bullet •
    clean = re.sub(r'(^|\n)\s*[-*•]\s+', r'\1• ', clean)
    return clean.strip()


def generate_conversation_csv(conv_id: int, msgs: List[Any]) -> bytes:
    """Builds UTF-8 BOM encoded CSV bytes for clinical audit reports."""
    output = io.StringIO()
    # Write UTF-8 BOM so Greek & medical characters (e.g. β-lactam) render cleanly in Excel
    output.write('\ufeff')
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)
    writer.writerow(["Role", "Timestamp", "Content"])

    for m in msgs:
        role_label = "Pharmacist" if m.role == "user" else "DrugGuide AI"
        time_str = m.created_at.strftime('%Y-%m-%d %H:%M:%S') if hasattr(m, 'created_at') and m.created_at else ""
        clean_content = format_markdown_for_csv(m.content or '')
        writer.writerow([role_label, time_str, clean_content])

    return output.getvalue().encode('utf-8')


def format_markdown_for_reportlab(text: str) -> str:
    """Formats markdown into ReportLab XML-compatible markup tags."""
    if not text:
        return ""
    safe = html.escape(text)
    # Convert markdown bold **text** to <b>text</b>
    safe = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', safe)
    # Convert markdown italic *text* or _text_ to <i>text</i>
    safe = re.sub(r'(?<!\*)\*(?!\s)(.+?)(?!\s)(?<!\*)\*', r'<i>\1</i>', safe)
    # Convert bullet markers at line starts to clean bullet symbol
    safe = re.sub(r'(^|\n)\s*[-*•]\s+', r'\1&bull;&nbsp; ', safe)
    # Convert newlines to ReportLab <br/> tags
    safe = safe.replace('\n', '<br/>')
    return safe


def build_conversation_pdf(
    conv_id: int,
    conv: Any,
    role: str,
    msgs: List[Any],
    notes: List[Any],
    pharmacist_info: Optional[Dict[str, Any]] = None
) -> bytes:
    """Compiles a clinical consultation transcript into an audit-grade PDF document."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor('#0f766e')
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#475569')
    )
    section_title_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=12,
        spaceAfter=6
    )
    user_bubble_style = ParagraphStyle(
        'UserBubble',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#0f172a')
    )
    assistant_bubble_style = ParagraphStyle(
        'AssistantBubble',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor('#1e293b')
    )
    note_style = ParagraphStyle(
        'NoteText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#78350f')
    )

    story = []

    # Title & Header
    story.append(Paragraph("Clinical Consultation Audit Report", title_style))
    story.append(Spacer(1, 4))

    created_str = conv.created_at.strftime('%B %d, %Y - %H:%M:%S') if hasattr(conv, 'created_at') and conv.created_at else ""
    meta_text = (
        f"<b>Case ID:</b> #{conv_id} &nbsp;|&nbsp; "
        f"<b>Date:</b> {created_str} &nbsp;|&nbsp; "
        f"<b>Category:</b> {html.escape(getattr(conv, 'category', 'Clinical Consultation') or 'Clinical Consultation')}"
    )
    if pharmacist_info:
        p_name = html.escape(pharmacist_info.get('full_name', '') or 'Practitioner')
        p_lic = html.escape(pharmacist_info.get('license_number', '') or 'Licensed')
        p_org = html.escape(pharmacist_info.get('pharmacy_organization', '') or 'Clinical Pharmacy Division')
        meta_text += f"<br/><b>Pharmacist:</b> {p_name} &nbsp;|&nbsp; <b>License:</b> {p_lic} &nbsp;|&nbsp; <b>Organization:</b> {p_org}"

    story.append(Paragraph(meta_text, meta_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0d9488'), spaceBefore=8, spaceAfter=12))

    # Topic Banner
    topic_title = html.escape(conv.title or 'Consultation')
    topic_data = [[
        Paragraph(f"<b>Case Inquiry Topic:</b> {topic_title}", user_bubble_style)
    ]]
    topic_table = Table(topic_data, colWidths=[540])
    topic_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0fdfa')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#99f6e4')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(topic_table)
    story.append(Spacer(1, 10))

    # Pharmacist Notes (if any)
    if notes:
        story.append(Paragraph(f"Private Practitioner Notes ({len(notes)})", section_title_style))
        for n in notes:
            n_date = n.created_at.strftime('%Y-%m-%d %H:%M') if hasattr(n, 'created_at') and n.created_at else ""
            escaped_note = format_markdown_for_reportlab(n.note or '')
            note_content = [
                Paragraph(f"<b>[Note Added: {n_date}]</b><br/>{escaped_note}", note_style)
            ]
            note_table = Table([[note_content]], colWidths=[540])
            note_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#fffbeb')),
                ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#fde68a')),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 10),
                ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ]))
            story.append(note_table)
            story.append(Spacer(1, 6))
        story.append(Spacer(1, 6))

    # Transcript
    story.append(Paragraph("Clinical Consultation Transcript", section_title_style))

    for m in msgs:
        role_label = "Pharmacist Inquiry" if m.role == "user" else "DrugGuide Clinical Evidence Synthesis"
        role_color = '#0d9488' if m.role == "user" else '#0284c7'
        bg_color = '#f8fafc' if m.role == "user" else '#f1f5f9'
        border_color = '#cbd5e1'

        m_time = m.created_at.strftime('%H:%M:%S') if hasattr(m, 'created_at') and m.created_at else ""
        header_para = Paragraph(
            f"<b><font color='{role_color}'>{role_label}</font></b> &nbsp;&nbsp;<font size=8 color='#94a3b8'>[{m_time}]</font>",
            meta_style
        )

        body_text = format_markdown_for_reportlab(m.content or '')
        body_para = Paragraph(body_text, user_bubble_style if m.role == "user" else assistant_bubble_style)

        card_content = [header_para, Spacer(1, 4), body_para]
        msg_table = Table([[card_content]], colWidths=[540])
        msg_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(bg_color)),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(border_color)),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(msg_table)
        story.append(Spacer(1, 8))

    # Footer
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0'), spaceBefore=6, spaceAfter=8))
    footer_text = "<b>Confidential Medical Record.</b> DrugGuide AI Assistant &bull; Authorized clinical documentation."
    story.append(Paragraph(footer_text, ParagraphStyle('Footer', parent=meta_style, alignment=1, fontSize=8, textColor=colors.HexColor('#94a3b8'))))

    doc.build(story)
    return buffer.getvalue()
