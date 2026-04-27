"""
pdf_exporter.py — PDF report generator using reportlab (Action Layer).

Converts report text into a professionally formatted PDF document
and saves it to the /reports directory.
"""

import os
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    HRFlowable,
    Table,
    TableStyle,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

logger = logging.getLogger(__name__)

# ── Output directory (relative to project root) ─────────────────────────────
REPORTS_DIR = Path(__file__).resolve().parent.parent / "reports"
REPORTS_DIR.mkdir(exist_ok=True)


def _build_styles() -> dict:
    """Build a custom style dictionary for the PDF."""
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "FinTitle",
            parent=base["Title"],
            fontSize=20,
            textColor=colors.HexColor("#0D1B2A"),
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
        ),
        "subtitle": ParagraphStyle(
            "FinSubtitle",
            parent=base["Normal"],
            fontSize=10,
            textColor=colors.HexColor("#5C758A"),
            spaceAfter=4,
            alignment=TA_CENTER,
        ),
        "section_header": ParagraphStyle(
            "FinSection",
            parent=base["Heading2"],
            fontSize=13,
            textColor=colors.HexColor("#1A3A5C"),
            spaceBefore=14,
            spaceAfter=4,
            fontName="Helvetica-Bold",
        ),
        "body": ParagraphStyle(
            "FinBody",
            parent=base["Normal"],
            fontSize=10,
            leading=16,
            textColor=colors.HexColor("#212121"),
            alignment=TA_JUSTIFY,
            spaceAfter=8,
        ),
        "disclaimer": ParagraphStyle(
            "FinDisclaimer",
            parent=base["Normal"],
            fontSize=8,
            textColor=colors.grey,
            alignment=TA_CENTER,
        ),
    }


def export_annual_report_pdf(
    ticker: str,
    year: int,
    report_text: str,
    financial_highlights: Optional[dict] = None,
) -> str:
    """
    Generate a professionally formatted PDF for an annual equity report.

    Args:
        ticker:               Stock symbol.
        year:                 Fiscal year.
        report_text:          Full report prose (400–500 words).
        financial_highlights: Optional dict of key metrics for a summary table.

    Returns:
        Absolute path to the saved PDF file.
    """
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"{ticker}_{year}_AnnualReport_{timestamp}.pdf"
    output_path = REPORTS_DIR / filename

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=LETTER,
        leftMargin=1 * inch,
        rightMargin=1 * inch,
        topMargin=1 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = _build_styles()
    story = []

    # ── Cover header ────────────────────────────────────────────────────────
    story.append(Paragraph("FinRobot-NVIDIA", styles["subtitle"]))
    story.append(
        Paragraph(f"Annual Equity Report — {ticker}", styles["title"])
    )
    story.append(Paragraph(f"Fiscal Year {year}", styles["subtitle"]))
    story.append(Spacer(1, 0.2 * inch))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1A3A5C")))
    story.append(Spacer(1, 0.2 * inch))

    # ── Financial highlights table (if provided) ─────────────────────────
    if financial_highlights:
        story.append(Paragraph("Financial Highlights", styles["section_header"]))
        table_data = [["Metric", "Value"]] + [
            [str(k), str(v)] for k, v in financial_highlights.items() if v
        ]
        if len(table_data) > 1:
            tbl = Table(table_data, colWidths=[3 * inch, 3 * inch])
            tbl.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1A3A5C")),
                        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                        ("FONTSIZE", (0, 0), (-1, -1), 9),
                        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
                        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
                        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ]
                )
            )
            story.append(tbl)
            story.append(Spacer(1, 0.15 * inch))

    # ── Report body ──────────────────────────────────────────────────────
    story.append(Paragraph("Analyst Report", styles["section_header"]))
    # Split by double newlines to keep paragraphs
    for para_text in report_text.strip().split("\n\n"):
        para_text = para_text.strip()
        if para_text:
            story.append(Paragraph(para_text, styles["body"]))

    # ── Footer / disclaimer ──────────────────────────────────────────────
    story.append(Spacer(1, 0.3 * inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.lightgrey))
    story.append(Spacer(1, 0.1 * inch))
    story.append(
        Paragraph(
            "DISCLAIMER: This report was generated by FinRobot-NVIDIA, an AI-powered financial analysis system. "
            "It is for informational purposes only and does not constitute investment advice or a solicitation "
            "to buy or sell any security. Past performance does not guarantee future results.",
            styles["disclaimer"],
        )
    )
    story.append(
        Paragraph(
            f"Generated: {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')}",
            styles["disclaimer"],
        )
    )

    doc.build(story)
    logger.info("PDF report saved: %s", output_path)
    return str(output_path)
