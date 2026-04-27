import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch

def generate_abstract_pdf(output_path):
    doc = SimpleDocTemplate(output_path, pagesize=A4, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    styles = getSampleStyleSheet()
    story = []

    # Custom styles
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#3b82f6"),
        alignment=1, # Center
        spaceAfter=20
    )
    
    section_style = ParagraphStyle(
        'SectionTitle',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor("#1e3a8a"),
        spaceBefore=15,
        spaceAfter=10
    )

    body_style = styles['Normal']
    body_style.fontSize = 11
    body_style.leading = 14

    # --- Title ---
    story.append(Paragraph("FinRobot-NVIDIA", title_style))
    story.append(Paragraph("Institutional-Grade Financial AI Agent Platform", styles['Heading3']))
    story.append(Spacer(1, 0.25 * inch))

    # --- Technologies ---
    story.append(Paragraph("Core Technologies", section_style))
    tech_data = [
        ["Category", "Stack Components"],
        ["Frontend", "Next.js 14, React, Tailwind CSS, TypeScript, Framer Motion"],
        ["Backend", "Python, FastAPI, Uvicorn, Pydantic"],
        ["Intelligence", "NVIDIA NIM (Llama 3 70B Instruct LLM)"],
        ["Data Feeds", "Finnhub, FMP API, NewsAPI, SEC API"],
        ["Library", "Recharts, Lightweight Charts, ReportLab"],
    ]
    t = Table(tech_data, colWidths=[1.5*inch, 4.0*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#3b82f6")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor("#f3f4f6")),
        ('GRID', (0, 0), (-1, -1), 1, colors.white)
    ]))
    story.append(t)
    story.append(Spacer(1, 0.25 * inch))

    # --- Problems ---
    story.append(Paragraph("Real-World Challenges Addressed", section_style))
    problems = [
        "<b>Information Overload:</b> Retail traders are overwhelmed by fragmented data from diverse sources.",
        "<b>Institutional Gap:</b> Professional analysis is expensive and slow, creating an 'edge gap' between retail and institutions.",
        "<b>Emotional Volatility:</b> Lack of data-backed reasoning leads to biased trading decisions."
    ]
    for p in problems:
        story.append(Paragraph(f"• {p}", body_style))
        story.append(Spacer(1, 5))

    # --- Solutions ---
    story.append(Paragraph("Platform Solutions", section_style))
    solutions = [
        "<b>Automated Insights:</b> Uses LLMs to analyze 10-K filings and news instantly.",
        "<b>Structured Reasoning:</b> Explains the logic behind every forecast using CoT reasoning.",
        "<b>Unified Dashboard:</b> Real-time price actions meet AI sentiment analysis for cohesive viewing."
    ]
    for s in solutions:
        story.append(Paragraph(f"✓ {s}", body_style))
        story.append(Spacer(1, 5))

    # --- How it Works ---
    story.append(Paragraph("Operating Mechanism", section_style))
    how_it_works = """
    The platform runs a multi-agent backend architecture. First, it orchestrates asynchronous 
    calls to global financial APIs (Finnhub, FMP, NewsAPI). This context is injected into 
    the NVIDIA NIM AI engine (Llama 3), which performs a multi-step 'Chain-of-Thought' analysis. 
    The results are streamed to a high-fidelity Next.js dashboard, where interactive charts 
    render both market data and AI insights simultaneously. For on-demand research, the 
    system generates professional-grade PDF equity reports synthesizing hundreds of 
    data points into readable analysis.
    """
    story.append(Paragraph(how_it_works, body_style))

    # Build PDF
    doc.build(story)
    print(f"PDF successfully generated at: {output_path}")

if __name__ == "__main__":
    generate_abstract_pdf("FinRobot_Project_Abstract.pdf")
