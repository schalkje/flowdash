$scriptLocation = $PSScriptRoot
Write-Output "Executing script from location: $scriptLocation"

$files = Get-ChildItem -Path . -Recurse -Filter *.html | Where-Object { $_.FullName -notlike '*\node_modules\*' -and $_.FullName -notlike '*\.archive\*' } | ForEach-Object { $_.FullName }

$outputPath = 'index.html'

# Exclude the output file from the list
$files = $files | Where-Object { $_ -notlike "*$outputPath" }
$files = $files | Where-Object { $_ -notlike "*index.html" }
$files = $files | ForEach-Object { $_.Replace($scriptLocation + "\", "") }

$groups = $files | Group-Object { ($_ -split "\\")[0] }

$htmlContent = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flow Demos</title>
    <style>
        :root { --sidebar-bg:#0f172a; --sidebar-fg:#cbd5e1; --sidebar-fg-strong:#e2e8f0; --border:rgba(148,163,184,.25); --link:#93c5fd; --bg:#0b1020; }
        *{box-sizing:border-box}
        html,body{height:100%}
        body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Fira Sans","Droid Sans","Helvetica Neue",Arial,sans-serif;background:var(--bg);color:var(--sidebar-fg)}
        .app{display:flex;min-height:100vh}
        .sidebar{width:320px;background:var(--sidebar-bg);color:var(--sidebar-fg);border-right:1px solid var(--border);display:flex;flex-direction:column;transition:width .2s ease;overflow:hidden}
        .sidebar-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;position:sticky;top:0;background:var(--sidebar-bg);border-bottom:1px solid var(--border);z-index:1}
        .sidebar-header h1{font-size:16px;font-weight:700;margin:0;color:var(--sidebar-fg-strong)}
        #sidebarToggle{appearance:none;border:1px solid var(--border);background:transparent;color:var(--sidebar-fg-strong);border-radius:8px;padding:6px 10px;cursor:pointer}
        #sidebarToggle:hover{background:rgba(255,255,255,.06)}
        nav#index{padding:8px 10px 24px;overflow-y:auto}
        .app.sidebar-collapsed .sidebar{width:48px}
        .app.sidebar-collapsed nav#index{display:none}
        .app.sidebar-collapsed .sidebar-header{justify-content:center}
        .app.sidebar-collapsed .sidebar-header h1{display:none}
        .content{flex:1;height:100vh;background:#0b1020}
        #viewer{width:100%;height:100%;border:0;background:#ffffff}
        details{border-radius:8px}
        summary{cursor:pointer;padding:6px 10px;border-radius:8px;outline:none;list-style:none}
        details[open]>summary{background:rgba(255,255,255,.06)}
        details.group>summary{font-weight:600;color:var(--sidebar-fg-strong)}
        details.folder>summary{margin-left:12px;color:var(--sidebar-fg)}
        .group-desc{margin:4px 0 4px 14px;font-size:12px;color:#94a3b8}
        ul.file-list{list-style:none;margin:4px 0 8px 28px;padding:0}
        li.file-li{display:flex;align-items:center;gap:6px;margin:2px 0}
        .file-li a{text-decoration:none;color:var(--link);padding:4px 6px;border-radius:6px}
        .file-li a:hover{background:rgba(148,163,184,.15)}
        .file-li a.active{background:rgba(147,197,253,.25);color:#fff}
        .link-icon{opacity:.7}
        .link-icon:hover{opacity:1}
        .number{display:inline-block;min-width:2ch;font-variant-numeric:tabular-nums;margin-right:6px;padding:2px 6px;background:rgba(148,163,184,.15);border:1px solid var(--border);border-radius:6px}
    </style>
    <script>
        function loadPage(path){var v=document.getElementById('viewer');if(v){v.src=path}try{window.history.replaceState(null,'','#'+encodeURIComponent(path))}catch(e){}}
        document.addEventListener('DOMContentLoaded',function(){
            var app=document.querySelector('.app');
            var toggleBtn=document.getElementById('sidebarToggle');
            if(localStorage.getItem('sidebarCollapsed')==='1'){app.classList.add('sidebar-collapsed')}
            if(toggleBtn){toggleBtn.addEventListener('click',function(){app.classList.toggle('sidebar-collapsed');localStorage.setItem('sidebarCollapsed',app.classList.contains('sidebar-collapsed')?'1':'0')})}
            document.querySelectorAll('details[data-key]').forEach(function(d){var key='open:'+d.dataset.key;var saved=localStorage.getItem(key);if(saved==='0'){d.removeAttribute('open')}if(saved==='1'){d.setAttribute('open','open')}d.addEventListener('toggle',function(){localStorage.setItem(key,d.open?'1':'0')})});
            document.addEventListener('click',function(e){var a=e.target.closest('a[data-load]');if(!a)return;e.preventDefault();var p=a.getAttribute('data-path');loadPage(p);document.querySelectorAll('.file-li a[data-load].active').forEach(function(el){el.classList.remove('active')});a.classList.add('active')});
            // Resolve the initial page from the URL hash (so bookmarked /#path
            // links actually open that page), falling back to the dashboard.
            var initialPath = 'dashboard/flowdash-bundle.html';
            if(location.hash && location.hash.length > 1){
                try { initialPath = decodeURIComponent(location.hash.slice(1)); } catch(e) {}
            }
            loadPage(initialPath);
            var initialLink = document.querySelector('a[data-path="'+initialPath.replace(/"/g,'\\"')+'"]');
            if(initialLink) { initialLink.classList.add('active'); }

            // Demo pages embed dashboard/demo-nav.js, which posts a message
            // when the user clicks Prev/Next inside the iframe. Mirror the
            // change in the sidebar + URL hash so the two stay aligned.
            window.addEventListener('message', function(e){
                var d = e && e.data; if(!d || d.type !== 'flowdash-nav' || !d.path) return;
                loadPage(d.path);
                document.querySelectorAll('.file-li a[data-load].active').forEach(function(el){el.classList.remove('active')});
                var link = document.querySelector('a[data-path="'+d.path.replace(/"/g,'\\"')+'"]');
                if(link) link.classList.add('active');
            });
        });
    </script>
</head>
<body>
    <div class="app">
        <aside class="sidebar">
            <div class="sidebar-header">
                <h1>Flow Demos</h1>
                <button id="sidebarToggle" title="Toggle sidebar" aria-label="Toggle sidebar">☰</button>
            </div>
            <nav id="index">
"@

$sectionDescriptions = @{
    '01_basicNodes' = 'Basic nodes: shapes, layouts, and states.'
    '02_rectangularNodes' = 'Rectangular nodes and demos.'
    '03_circleNodes' = 'Circle nodes and demos.'
    '04_laneNodes' = 'Lane containers and nested tests.'
    '05_columnsNodes' = 'Columns containers: basic and nested tests.'
    '06_adapterNodes' = 'Adapter nodes: basic, single, and specified layouts.'
    '07_foundationNodes' = 'Foundation nodes with orientation variants.'
    '08_martNodes' = 'Mart nodes with modes and orientations.'
    '09_groupNodes' = 'Group nodes.'
    '10_edges' = 'Edges and routing demos (basic, simple, extended).'
    '11_dashboard' = 'Dashboard layout and components.'
    'd3_basics' = 'Introductory D3.js examples and learning modules.'
    'dashboard' = 'Main product: Modular dashboard with real data and advanced features.'
    'experiments' = 'Advanced and experimental D3/network visualizations.'
}

foreach ($group in $groups) {
    $groupKey = $group.Name
    $groupName = $groupKey -replace "[_-]", " "
    if ($groupName -match "^(\d+)(.*)") {
        $groupName = "<span class='number'>$($matches[1])</span>$($matches[2])"
    }
    $desc = $sectionDescriptions[$groupKey]
    
    # Only dashboard should be expanded by default
    $isOpen = if ($groupKey -eq 'dashboard') { 'open' } else { '' }
    
    $htmlContent += "<details class='group' data-key='group/$groupKey' $isOpen>"
    $htmlContent += "<summary>$groupName</summary>`n"
    if ($desc) { $htmlContent += "<div class='group-desc'>$desc</div>" }
    # Group files by folder within the group
    $folders = $group.Group | Group-Object { ($_ -split "\\")[1] }
    foreach ($folder in $folders) {
        $folderName = $folder.Name
        # Only expand dashboard folders by default
        $folderOpen = if ($groupKey -eq 'dashboard') { 'open' } else { '' }
        $htmlContent += "<details class='folder' data-key='folder/$groupKey/$folderName' $folderOpen>"
        $htmlContent += "<summary><span class='folder'>$folderName/</span></summary>"
        $htmlContent += "<ul class='file-list'>"

        foreach ($file in $folder.Group) {
            $relativePath = $file -replace '\\', '/'
            $fileName = [System.IO.Path]::GetFileName($file)
            $htmlContent += "<li class='file-li'>"
            $htmlContent += "<a href='#' data-load='1' data-path='$relativePath'>$fileName</a> "
            $htmlContent += "<a href='$relativePath' target='_blank' class='link-icon'>🔗</a>"
            $htmlContent += "</li>"
        }

        $htmlContent += "</ul>"
        $htmlContent += "</details>"
    }
    $htmlContent += "</details>`n"
}

$htmlContent += @"
            </nav>
        </aside>
        <main class="content">
            <iframe id="viewer"></iframe>
        </main>
    </div>
</body>
</html>
"@

Set-Content -Path $outputPath -Value $htmlContent
Write-Output "Index file generated: $outputPath"