import os
import re

base_dir = r"C:\Users\saxen\.gemini\antigravity\scratch\auv-sonar-website"
pages = [
    ("overview", "index.html"),
    ("live-sonar", "live-sonar.html"),
    ("adaptive-control", "adaptive-control.html"),
    ("waveforms", "waveforms.html"),
    ("power", "power.html"),
    ("experiments", "experiments.html"),
    ("hardware", "hardware.html"),
    ("logs", "logs.html")
]

combined_css = ""
combined_js = ""
page_views_html = ""

# Read global css and js
with open(os.path.join(base_dir, "css", "style.css"), "r", encoding="utf-8") as f:
    combined_css += f.read() + "\n"

with open(os.path.join(base_dir, "js", "main.js"), "r", encoding="utf-8") as f:
    combined_js += f.read() + "\n"

def fix_links(html):
    for p_id, p_file in pages:
        html = html.replace(f'href="{p_file}"', f'href="#{p_id}"')
        html = html.replace(f"href='{p_file}'", f"href='#{p_id}'")
    return html

# Extract sidebar
with open(os.path.join(base_dir, "index.html"), "r", encoding="utf-8") as f:
    index_content = f.read()
    sidebar_match = re.search(r'<aside class="sidebar">.*?</aside>', index_content, re.DOTALL)
    sidebar_html = fix_links(sidebar_match.group(0)) if sidebar_match else ""

for p_id, p_file in pages:
    filepath = os.path.join(base_dir, p_file)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Extract specific styles
    styles = re.findall(r'<style>(.*?)</style>', content, re.DOTALL)
    for s in styles:
        combined_css += s + "\n"
        
    # Extract specific scripts
    scripts = re.findall(r'<script(?![^>]*src=)>(.*?)</script>', content, re.DOTALL)
    for s in scripts:
        s = re.sub(r'function initPageCharts\(\)', f'function initPageCharts_{p_id.replace("-", "_")}()', s)
        combined_js += s + "\n"

    # Extract content inside <main class="main-content"> ... </main> or <div class="main-content"> ... </div>
    main_match = re.search(r'<(main|div) class="main-content">(.*?)</\1>', content, re.DOTALL)
    if main_match:
        page_html = main_match.group(2)
    else:
        # Fallback to page-header + page-body
        header = re.search(r'<header class="page-header.*?>(.*?)</header>', content, re.DOTALL)
        body = re.search(r'<(div|main) class="page-body">(.*?)</\1>', content, re.DOTALL)
        page_html = (header.group(0) if header else "") + "\n" + (body.group(0) if body else "")

    page_html = f'<div class="page-view {"active" if p_id == "overview" else ""}" id="page-{p_id}">\n{page_html}\n</div>\n'
    page_views_html += fix_links(page_html)


router_js = """
// Router logic
function handleHashChange() {
    let hash = window.location.hash.substring(1);
    if (!hash) hash = 'overview';
    
    document.querySelectorAll('.page-view').forEach(el => {
        el.classList.remove('active');
    });
    
    const targetPage = document.getElementById('page-' + hash);
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
        el.classList.remove('active');
        if (el.getAttribute('href') === '#' + hash) {
            el.classList.add('active');
        }
    });
    
    if (typeof cleanup_liveSonar === 'function' && hash !== 'live-sonar') {
        cleanup_liveSonar();
    }
    
    setTimeout(() => {
        const initFnName = 'initPageCharts_' + hash.replace("-", "_");
        if (typeof window[initFnName] === 'function') {
            window[initFnName]();
        }
    }, 50);
}

window.addEventListener('hashchange', handleHashChange);
document.addEventListener('DOMContentLoaded', () => {
    handleHashChange();
});

let cleanup_liveSonar = function() {
    if (typeof echogramInterval !== 'undefined' && echogramInterval) {
        clearInterval(echogramInterval);
        echogramInterval = null;
    }
};
"""

combined_js += router_js
combined_js = combined_js.replace("if (typeof initPageCharts === 'function') {", "if (false) {")
combined_js = combined_js.replace("initPageCharts();", "")

final_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TARANG — Adaptive Sonar Payload Dashboard</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌊</text></svg>">
  <style>
{combined_css}
.page-view {{ display: none; }}
.page-view.active {{ display: block; }}
  </style>
</head>
<body>

  <button class="mobile-toggle" aria-label="Toggle Navigation Menu">☰</button>

  <div class="dashboard">
{sidebar_html}
    <main class="main-content">
{page_views_html}
    </main>
  </div>

  <script>
{combined_js}
  </script>
</body>
</html>
'''

with open(os.path.join(base_dir, "dashboard.html"), "w", encoding="utf-8") as f:
    f.write(final_html)

print("dashboard.html created successfully.")
