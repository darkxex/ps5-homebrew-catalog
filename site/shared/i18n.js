/* The pages' language. The catalog's records are never translated: they stay as their developers wrote
   them. Only the interface is: its words, the category and kind names (the records carry the keys,
   `emulators`, `game`, and the labels come from here), dates and plurals.

   The HTML is built in English. This script runs while <head> is parsed, so every script after it can
   ask for words (`I18N.t`); when the document is ready it translates the words already in the page:
     data-i18n="key"                 the element's own text (the first text of it, so a count in a child stays)
     data-i18n-html="key"            the element's markup, for a sentence with links or <code> in it
     data-i18n-attr="alt:key;title:key"
     data-v-name="value"             fills {name} in the sentence; a value "@key" is itself translated
     <time datetime>                 the date, written the way the language writes it
   The choice is kept in this browser (`?lang=xx` sets it), then the browser's own language is used.
   No inline styles or handlers: the site's content security policy allows neither. */
(function () {
  "use strict";

  var LANGS = [
    ["en", "🇺🇸", "English"],
    ["es", "🇪🇸", "Español"],
    ["fr", "🇫🇷", "Français"],
    ["pt", "🇧🇷", "Português"],
    ["ja", "🇯🇵", "日本語"],
    ["de", "🇩🇪", "Deutsch"],
    ["nl", "🇳🇱", "Nederlands"],
    ["tr", "🇹🇷", "Türkçe"],
    ["zh", "🇨🇳", "简体中文"]
  ];
  var KEY = "catalog-lang";
  var SHADOW = '<a href="https://github.com/drakmor/ShadowMountPlus">ShadowMountPlus</a>';
  var SCAN = '<a href="https://github.com/darkxex/ps5-homebrew-catalog/blob/main/docs/automation.md#release-scan">';

  /* A value may be [one, other] when it depends on a count `n`. */
  var WORDS = {
    en: {
      "brand.from": "PS5 catalog",
      "skip": "Skip to content", "nav.sections": "Sections",
      "tab.discover": "Discover", "tab.apps": "Apps", "tab.games": "Games", "tab.tools": "Tools", "tab.soon": "Coming soon", "tab.all": "All",
      "search.label": "Search apps", "search.placeholder": "Search",
      "link.tv": "TV mode", "link.submit": "Submit app",
      "notice.tag": "New",
      "notice.text": "<strong>ProsperoStore is here.</strong> Browse, install and update every app in this catalog straight from your PS5. Now in alpha.",
      "notice.go": "Get it on GitHub",
      "foot.catalog": "Catalog", "foot.publish": "Publish an app", "foot.policy": "Review policy", "foot.report": "Report an app",
      "foot.feed": "JSON feed", "foot.source": "Source",
      "foot.fine": "Lists native PS5 homebrew apps only. Community-run and not affiliated with Sony Interactive Entertainment. Downloads come from each developer's own GitHub release; this site doesn't host them. Each developer is solely responsible for their app's licensing and content. Listings are provided as-is, without warranty, and a listing is not a security audit. <a href=\"{repo}#disclaimer\">Disclaimer</a> · Maintained by <a href=\"https://github.com/darkxex\">darkxex</a>, created by <a href=\"https://github.com/blackbearreloaded\">BlackBearReloaded</a> · Built from <a href=\"{repo}/commit/{commit}\">{short}</a>",
      "foot.updated": " · last updated {time} UTC",
      "lang.label": "Language",
      "translate.original": "Show original", "translate.translated": "Show translation",
      "stage.details": "View details", "stage.new": "New release", "stage.featured": "Featured",
      "heading.home": "PS5 homebrew", "heading.results": "Results for “{q}”",
      "title.home": "PS5 Homebrew Store — community apps, games and tools", "title.suffix": "PS5 Homebrew Store", "title.search": "Search",
      "sort.title": "Change the order", "sort.by": "Sorted by ", "order.name": "Name", "order.updated": "Recently updated", "order.liked": "Most liked", "order.author": "Developer",
      "empty.title": "No matches", "empty.text": "Try another app name or developer.",
      "cats.label": "Categories", "cats.all": "All",
      "shelf.new": "New in the catalog", "shelf.updated": "Recently updated", "shelf.changed": "New and updated", "shelf.liked": "Most liked",
      "shelf.all": "See all", "shelf.prev": "Earlier in {title}", "shelf.next": "More of {title}",
      "n.likes": ["{n} like", "{n} likes"], "n.comments": ["{n} comment", "{n} comments"], "n.apps": ["{n} app", "{n} apps"],
      "stats.aria": "{likes}, {comments}",
      "copy": "Copy", "copied": "Copied",
      "comments.someone": "someone", "comments.readall": "Read all {n} comments on GitHub",
      "app.back": "All apps", "app.updated": "Updated", "app.reserved": "Reserved", "app.facts": "Release facts", "app.status": "Status",
      "app.like": "Like", "app.comment": "Comment", "app.shared": "The ID is not unique",
      "app.sharednote": "Another app is listed with the title ID <code>{titleid}</code>: {links}. A console holds one app per title ID, so installing this one replaces the other and they share save data.",
      "comments.title": "Comments", "comments.none": "No comments yet. <a data-comments-link href=\"{href}\">Write the first one on GitHub</a>.",
      "comments.more": "Comment on GitHub",
      "install.title": "Install",
      "install.note": "Read the <a href=\"{release}\">release notes</a> and the <a href=\"{repo}\">project's documentation</a> first. Some apps need extra setup, such as a payload, configuration or additional files, and the developer's instructions take precedence over the general steps below.",
      "step.zip.1": "Download <code>{file}</code> and extract it on your computer.",
      "step.zip.2": "Copy the extracted <code>{titleid}/</code> folder to <code>/data/homebrew/</code> on your PS5, for example over FTP.",
      "step.zip.3": "A loader such as " + SHADOW + " picks it up. Launch {name} from the home screen.",
      "step.img.1": "Download <code>{file}</code>.",
      "step.img.2": "Copy the file as-is to <code>/data/homebrew/</code> on your PS5, for example over FTP.",
      "step.img.3": SHADOW + " mounts the image. Launch {name} from the home screen.",
      "verify.title": "Verify", "verify.text": "This listing is pinned to one exact file. <code>sha256sum {file}</code> must print:",
      "verify.note": "This app and its content are the responsibility of its developer, {author}. Homebrew runs with elevated access on a jailbroken console; install only what you trust.",
      "source.title": "Source", "source.release": "Release {tag}",
      "details.title": "Details", "d.titleid": "Title ID", "d.category": "Category", "d.version": "Version", "d.format": "Format", "d.license": "License",
      "d.file": "File", "d.updated": "Updated", "d.status": "Status", "d.reserved": "Reserved", "d.source": "Source", "d.likes": "Likes", "d.comments": "Comments",
      "panel.kicker": "Get this app", "panel.ready": "Ready", "panel.note": "Straight from the developer's GitHub release",
      "panel.download": "Download", "panel.source": "Source code",
      "panel.reason": "Pinned to one exact file by its SHA-256. Compare it before you install.",
      "panel.get": "Get this app", "store.q": "On your PS5?", "store.text": "Install and update it from the couch with ProsperoStore.",
      "soon.title": "Not released yet",
      "soon.text": "{author} has reserved title ID <code>{titleid}</code> for this {kind}. Its download, source and icon appear here when the first release is listed.",
      "soon.note": "No release has been published yet", "soon.later": "It will appear here when it is released.",
      "notes.title": "Release notes", "notes.source": "Written by {author} for {version}. ", "notes.full": "Read the full notes on GitHub", "notes.see": "See this release on GitHub",
      "safety.title": "Safety", "safety.aria": "Scan results",
      "sb.stays": "Stays in the sandbox", "sb.stays.text": "The scan found no way for this app to reach beyond its own files: no payload, no connection to the payload loader, no request to a jailbreak service.",
      "sb.leaves": "Leaves the sandbox", "sb.leaves.text": "This app can get full access to the console, usually to read and write files outside its own folder. Install it only if you trust its developer.",
      "sb.unclear": "Sandbox: unclear", "sb.unclear.text": "The scan found weak signs that this app may reach the payload loader, and could not settle it.",
      "helpers.unrev": ["{n} helper not reviewed", "{n} helpers not reviewed"],
      "helpers.unrev.text": ["It ships {n} helper program that runs outside the sandbox; {u} of them the catalog's maintainers have not read.", "It ships {n} helper programs that run outside the sandbox; {u} of them the catalog's maintainers have not read."],
      "helpers.ok": "Helpers reviewed",
      "helpers.ok.text": ["It ships {n} helper program that runs outside the sandbox, on the catalog's list of reviewed helpers.", "It ships {n} helper programs that run outside the sandbox, all on the catalog's list of reviewed helpers."],
      "build.attested": "Built by GitHub Actions", "build.attested.text": "GitHub holds a signed statement that a workflow of the app's repository built exactly this file.",
      "build.workflow": "Released by a workflow", "build.workflow.text": "A workflow of the app's repository attached this file to the release. Nothing proves where it was built.",
      "build.developer": "Built by the developer", "build.developer.text": "The developer built and uploaded this file by hand. Nothing ties it to the published source.",
      "safety.source": "From an automatic scan of the release file, which is read and never run. It can miss things: it is not a guarantee. " + SCAN + "How the scan works</a>",
      "lost.kicker": "Error 404", "lost.title": "Nothing on this shelf", "lost.text": "This page isn't in the catalog. The app may have been renamed or withdrawn.",
      "fmt.zip": "ZIP folder", "fmt.ffpkg": "FFPKG image", "fmt.ffpfsc": "FFPFSC image",
      "kind.app": "App", "kind.game": "Game", "kind.tool": "Tool",
      "kindlc.app": "app", "kindlc.game": "game", "kindlc.tool": "tool",
      "unlicensed": "Unlicensed",
      "cat.console-ports": "Console game ports", "cat.pc-ports": "PC game ports", "cat.homebrew-games": "Homebrew games", "cat.emulators": "Emulators",
      "cat.streaming": "Game streaming", "cat.video": "Video & TV", "cat.music": "Music & audio", "cat.ai": "AI", "cat.utilities": "Utilities",
      "cat.tools": "Tools & tests", "cat.showcases": "Showcases",
      "tv.title": "PS5 Homebrew — TV", "tv.sort": "Sort", "tv.exit": "Exit TV mode", "tv.cats": "Categories", "tv.empty": "Nothing here yet.",
      "tv.soonbadge": "Soon", "tv.by": "by {author}", "tv.of": "{i} of {total}",
      "tv.sortedby": "{count} · sorted by {sort}",
      "tv.hint.move": "Move", "tv.hint.open": "Open", "tv.hint.back": "Back", "tv.hint.sort": "Sort", "tv.hint.menu": "Menu",
      "tv.hint.changesort": "Change sort", "tv.hint.exit": "Exit", "tv.hint.browse": "Browse", "tv.hint.language": "Change language", "tv.hint.detail": "Previous / next · scroll",
      "tv.credit": "Maintained by darkxex, created by BlackBearReloaded · Built from {short}",
      "tv.reserved": "This title ID is reserved by its developer. The app isn't released yet; it will appear here with a download once it is.",
      "tv.scan": "Scan, or open on your computer or phone, to download it:", "tv.hash": "SHA-256 of {file}",
      "tv.releasenote": "Read the release notes first: some apps need a payload or extra setup. {author} is solely responsible for this app and its content.",
      "tv.comments": "Comments ({n})",
      "tv.cm.like.scan": "To like this app or comment, scan this code on your phone: it opens the app's discussion on GitHub, where a GitHub account is needed.",
      "tv.cm.like.open": "To like this app or comment, open {url} on your phone: it opens the app's discussion on GitHub, where a GitHub account is needed.",
      "tv.cm.first.scan": "No comments yet. To write the first, or to like this app, scan this code on your phone: it opens the app's discussion on GitHub, where a GitHub account is needed.",
      "tv.cm.first.open": "No comments yet. To write the first, or to like this app, open {url} on your phone: it opens the app's discussion on GitHub, where a GitHub account is needed.",
      "tv.qr": "QR code for {address}",
      "tv.nojs": "TV mode needs JavaScript. <a href=\"{base}\">Open the regular catalog</a>."
    },

    es: {
      "brand.from": "Catálogo PS5",
      "skip": "Ir al contenido", "nav.sections": "Secciones",
      "tab.discover": "Descubrir", "tab.apps": "Apps", "tab.games": "Juegos", "tab.tools": "Herramientas", "tab.soon": "Próximamente", "tab.all": "Todo",
      "search.label": "Buscar apps", "search.placeholder": "Buscar",
      "link.tv": "Modo TV", "link.submit": "Enviar app",
      "notice.tag": "Nuevo",
      "notice.text": "<strong>ProsperoStore ya está aquí.</strong> Explora, instala y actualiza cada app de este catálogo directamente desde tu PS5. Ahora en alfa.",
      "notice.go": "Consíguelo en GitHub",
      "foot.catalog": "Catálogo", "foot.publish": "Publicar una app", "foot.policy": "Política de revisión", "foot.report": "Reportar una app",
      "foot.feed": "Feed JSON", "foot.source": "Código fuente",
      "foot.fine": "Solo incluye apps homebrew nativas de PS5. Gestionado por la comunidad y sin relación con Sony Interactive Entertainment. Las descargas provienen de la release de GitHub de cada desarrollador; este sitio no las aloja. Cada desarrollador es el único responsable de la licencia y el contenido de su app. Los listados se ofrecen tal cual, sin garantía, y un listado no es una auditoría de seguridad. <a href=\"{repo}#disclaimer\">Aviso legal</a> · Mantenido por <a href=\"https://github.com/darkxex\">darkxex</a>, creado por <a href=\"https://github.com/blackbearreloaded\">BlackBearReloaded</a> · Compilado desde <a href=\"{repo}/commit/{commit}\">{short}</a>",
      "foot.updated": " · última actualización {time} UTC",
      "lang.label": "Idioma",
      "translate.original": "Mostrar original", "translate.translated": "Mostrar traducción",
      "stage.details": "Ver detalles", "stage.new": "Nueva versión", "stage.featured": "Destacado",
      "heading.home": "Homebrew de PS5", "heading.results": "Resultados para “{q}”",
      "title.home": "PS5 Homebrew Store — apps, juegos y herramientas de la comunidad", "title.suffix": "PS5 Homebrew Store", "title.search": "Búsqueda",
      "sort.title": "Cambiar el orden", "sort.by": "Ordenado por ", "order.name": "Nombre", "order.updated": "Actualizados recientemente", "order.liked": "Más votados", "order.author": "Desarrollador",
      "empty.title": "Sin resultados", "empty.text": "Prueba con otro nombre de app o desarrollador.",
      "cats.label": "Categorías", "cats.all": "Todas",
      "shelf.new": "Novedades del catálogo", "shelf.updated": "Actualizados recientemente", "shelf.changed": "Nuevos y actualizados", "shelf.liked": "Más votados",
      "shelf.all": "Ver todo", "shelf.prev": "Anteriores en {title}", "shelf.next": "Más de {title}",
      "n.likes": ["{n} me gusta", "{n} me gusta"], "n.comments": ["{n} comentario", "{n} comentarios"], "n.apps": ["{n} app", "{n} apps"],
      "stats.aria": "{likes}, {comments}",
      "copy": "Copiar", "copied": "Copiado",
      "comments.someone": "alguien", "comments.readall": "Leer los {n} comentarios en GitHub",
      "app.back": "Todas las apps", "app.updated": "Actualizado", "app.reserved": "Reservado", "app.facts": "Datos de la versión", "app.status": "Estado",
      "app.like": "Me gusta", "app.comment": "Comentar", "app.shared": "El ID no es único",
      "app.sharednote": "Hay otra app listada con el title ID <code>{titleid}</code>: {links}. Una consola guarda una sola app por title ID, así que instalar esta reemplaza a la otra y comparten los datos guardados.",
      "comments.title": "Comentarios", "comments.none": "Aún no hay comentarios. <a data-comments-link href=\"{href}\">Escribe el primero en GitHub</a>.",
      "comments.more": "Comentar en GitHub",
      "install.title": "Instalar",
      "install.note": "Lee primero las <a href=\"{release}\">notas de la versión</a> y la <a href=\"{repo}\">documentación del proyecto</a>. Algunas apps necesitan configuración adicional, como un payload, ajustes o archivos extra, y las instrucciones del desarrollador tienen prioridad sobre los pasos generales de abajo.",
      "step.zip.1": "Descarga <code>{file}</code> y extráelo en tu PC.",
      "step.zip.2": "Copia la carpeta extraída <code>{titleid}/</code> a <code>/data/homebrew/</code> en tu PS5, por ejemplo por FTP.",
      "step.zip.3": "Un cargador como " + SHADOW + " la detecta. Abre {name} desde la pantalla de inicio.",
      "step.img.1": "Descarga <code>{file}</code>.",
      "step.img.2": "Copia el archivo tal cual a <code>/data/homebrew/</code> en tu PS5, por ejemplo por FTP.",
      "step.img.3": SHADOW + " monta la imagen. Abre {name} desde la pantalla de inicio.",
      "verify.title": "Verificar", "verify.text": "Este listado está fijado a un archivo exacto. <code>sha256sum {file}</code> debe mostrar:",
      "verify.note": "Esta app y su contenido son responsabilidad de su desarrollador, {author}. El homebrew se ejecuta con acceso elevado en una consola con jailbreak; instala solo lo que merezca tu confianza.",
      "source.title": "Código fuente", "source.release": "Versión {tag}",
      "details.title": "Detalles", "d.titleid": "Title ID", "d.category": "Categoría", "d.version": "Versión", "d.format": "Formato", "d.license": "Licencia",
      "d.file": "Archivo", "d.updated": "Actualizado", "d.status": "Estado", "d.reserved": "Reservado", "d.source": "Código fuente", "d.likes": "Me gusta", "d.comments": "Comentarios",
      "panel.kicker": "Consigue esta app", "panel.ready": "Lista", "panel.note": "Directo desde la release de GitHub del desarrollador",
      "panel.download": "Descargar", "panel.source": "Código fuente",
      "panel.reason": "Fijado a un archivo exacto mediante su SHA-256. Compáralo antes de instalar.",
      "panel.get": "Consigue esta app", "store.q": "¿En tu PS5?", "store.text": "Instálala y actualízala desde el sofá con ProsperoStore.",
      "soon.title": "Aún no publicada",
      "soon.text": "{author} ha reservado el title ID <code>{titleid}</code> para este {kind}. La descarga, el código fuente y el icono aparecerán aquí cuando se liste la primera versión.",
      "soon.note": "Todavía no se ha publicado ninguna versión", "soon.later": "Aparecerá aquí cuando se publique.",
      "notes.title": "Notas de la versión", "notes.source": "Escrito por {author} para {version}. ", "notes.full": "Leer las notas completas en GitHub", "notes.see": "Ver esta versión en GitHub",
      "safety.title": "Seguridad", "safety.aria": "Resultados del análisis",
      "sb.stays": "Permanece en el sandbox", "sb.stays.text": "El análisis no encontró ninguna forma de que esta app salga de sus propios archivos: ni payload, ni conexión con el cargador de payloads, ni peticiones a un servicio de jailbreak.",
      "sb.leaves": "Sale del sandbox", "sb.leaves.text": "Esta app puede obtener acceso total a la consola, normalmente para leer y escribir archivos fuera de su propia carpeta. Instálala solo si confías en su desarrollador.",
      "sb.unclear": "Sandbox: no está claro", "sb.unclear.text": "El análisis encontró indicios débiles de que esta app podría llegar al cargador de payloads, y no pudo confirmarlo.",
      "helpers.unrev": ["{n} ayudante sin revisar", "{n} ayudantes sin revisar"],
      "helpers.unrev.text": ["Incluye {n} programa auxiliar que se ejecuta fuera del sandbox; {u} de ellos no ha sido leído por los mantenedores del catálogo.", "Incluye {n} programas auxiliares que se ejecutan fuera del sandbox; {u} de ellos no han sido leídos por los mantenedores del catálogo."],
      "helpers.ok": "Ayudantes revisados",
      "helpers.ok.text": ["Incluye {n} programa auxiliar que se ejecuta fuera del sandbox y figura en la lista de ayudantes revisados del catálogo.", "Incluye {n} programas auxiliares que se ejecutan fuera del sandbox, todos en la lista de ayudantes revisados del catálogo."],
      "build.attested": "Compilado por GitHub Actions", "build.attested.text": "GitHub conserva una declaración firmada de que un workflow del repositorio de la app compiló exactamente este archivo.",
      "build.workflow": "Publicado por un workflow", "build.workflow.text": "Un workflow del repositorio de la app adjuntó este archivo a la release. Nada demuestra dónde se compiló.",
      "build.developer": "Compilado por el desarrollador", "build.developer.text": "El desarrollador compiló y subió este archivo a mano. Nada lo vincula con el código fuente publicado.",
      "safety.source": "Resultado de un análisis automático del archivo de la release, que se lee pero nunca se ejecuta. Puede pasar cosas por alto: no es una garantía. " + SCAN + "Cómo funciona el análisis</a>",
      "lost.kicker": "Error 404", "lost.title": "No hay nada en este estante", "lost.text": "Esta página no está en el catálogo. Puede que la app haya cambiado de nombre o se haya retirado.",
      "fmt.zip": "Carpeta ZIP", "fmt.ffpkg": "Imagen FFPKG", "fmt.ffpfsc": "Imagen FFPFSC",
      "kind.app": "App", "kind.game": "Juego", "kind.tool": "Herramienta",
      "kindlc.app": "app", "kindlc.game": "juego", "kindlc.tool": "herramienta",
      "unlicensed": "Sin licencia",
      "cat.console-ports": "Ports de juegos de consola", "cat.pc-ports": "Ports de juegos de PC", "cat.homebrew-games": "Juegos homebrew", "cat.emulators": "Emuladores",
      "cat.streaming": "Streaming de juegos", "cat.video": "Video y TV", "cat.music": "Música y audio", "cat.ai": "IA", "cat.utilities": "Utilidades",
      "cat.tools": "Herramientas y pruebas", "cat.showcases": "Demostraciones",
      "tv.title": "PS5 Homebrew — TV", "tv.sort": "Orden", "tv.exit": "Salir del modo TV", "tv.cats": "Categorías", "tv.empty": "Aún no hay nada aquí.",
      "tv.soonbadge": "Pronto", "tv.by": "de {author}", "tv.of": "{i} de {total}",
      "tv.sortedby": "{count} · ordenado por {sort}",
      "tv.hint.move": "Mover", "tv.hint.open": "Abrir", "tv.hint.back": "Atrás", "tv.hint.sort": "Orden", "tv.hint.menu": "Menú",
      "tv.hint.changesort": "Cambiar orden", "tv.hint.exit": "Salir", "tv.hint.browse": "Explorar", "tv.hint.language": "Cambiar idioma", "tv.hint.detail": "Anterior / siguiente · desplazar",
      "tv.credit": "Mantenido por darkxex, creado por BlackBearReloaded · Compilado desde {short}",
      "tv.reserved": "Este title ID está reservado por su desarrollador. La app aún no se ha publicado; aparecerá aquí con su descarga cuando lo esté.",
      "tv.scan": "Escanea, o abre en tu PC o teléfono, para descargarla:", "tv.hash": "SHA-256 de {file}",
      "tv.releasenote": "Lee primero las notas de la versión: algunas apps necesitan un payload o configuración adicional. {author} es el único responsable de esta app y su contenido.",
      "tv.comments": "Comentarios ({n})",
      "tv.cm.like.scan": "Para dar me gusta a esta app o comentar, escanea este código con tu teléfono: abre la discusión de la app en GitHub, donde hace falta una cuenta de GitHub.",
      "tv.cm.like.open": "Para dar me gusta a esta app o comentar, abre {url} en tu teléfono: abre la discusión de la app en GitHub, donde hace falta una cuenta de GitHub.",
      "tv.cm.first.scan": "Aún no hay comentarios. Para escribir el primero, o para dar me gusta a esta app, escanea este código con tu teléfono: abre la discusión de la app en GitHub, donde hace falta una cuenta de GitHub.",
      "tv.cm.first.open": "Aún no hay comentarios. Para escribir el primero, o para dar me gusta a esta app, abre {url} en tu teléfono: abre la discusión de la app en GitHub, donde hace falta una cuenta de GitHub.",
      "tv.qr": "Código QR de {address}",
      "tv.nojs": "El modo TV necesita JavaScript. <a href=\"{base}\">Abrir el catálogo normal</a>."
    },

    fr: {
      "brand.from": "Catalogue PS5",
      "skip": "Aller au contenu", "nav.sections": "Sections",
      "tab.discover": "Découvrir", "tab.apps": "Apps", "tab.games": "Jeux", "tab.tools": "Outils", "tab.soon": "Bientôt", "tab.all": "Tout",
      "search.label": "Rechercher des apps", "search.placeholder": "Rechercher",
      "link.tv": "Mode TV", "link.submit": "Soumettre une app",
      "notice.tag": "Nouveau",
      "notice.text": "<strong>ProsperoStore est là.</strong> Parcourez, installez et mettez à jour chaque app de ce catalogue directement depuis votre PS5. Actuellement en alpha.",
      "notice.go": "Le récupérer sur GitHub",
      "foot.catalog": "Catalogue", "foot.publish": "Publier une app", "foot.policy": "Politique de vérification", "foot.report": "Signaler une app",
      "foot.feed": "Flux JSON", "foot.source": "Code source",
      "foot.fine": "Ne répertorie que des apps homebrew natives pour PS5. Géré par la communauté et sans lien avec Sony Interactive Entertainment. Les téléchargements proviennent de la release GitHub de chaque développeur ; ce site ne les héberge pas. Chaque développeur est seul responsable de la licence et du contenu de son app. Les fiches sont fournies telles quelles, sans garantie, et une fiche n'est pas un audit de sécurité. <a href=\"{repo}#disclaimer\">Avertissement</a> · Maintenu par <a href=\"https://github.com/darkxex\">darkxex</a>, créé par <a href=\"https://github.com/blackbearreloaded\">BlackBearReloaded</a> · Construit depuis <a href=\"{repo}/commit/{commit}\">{short}</a>",
      "foot.updated": " · dernière mise à jour {time} UTC",
      "lang.label": "Langue",
      "translate.original": "Afficher l'original", "translate.translated": "Afficher la traduction",
      "stage.details": "Voir les détails", "stage.new": "Nouvelle version", "stage.featured": "À la une",
      "heading.home": "Homebrew PS5", "heading.results": "Résultats pour « {q} »",
      "title.home": "PS5 Homebrew Store — apps, jeux et outils de la communauté", "title.suffix": "PS5 Homebrew Store", "title.search": "Recherche",
      "sort.title": "Changer l'ordre", "sort.by": "Trié par ", "order.name": "Nom", "order.updated": "Mis à jour récemment", "order.liked": "Les plus aimés", "order.author": "Développeur",
      "empty.title": "Aucun résultat", "empty.text": "Essayez un autre nom d'app ou de développeur.",
      "cats.label": "Catégories", "cats.all": "Toutes",
      "shelf.new": "Nouveautés du catalogue", "shelf.updated": "Mis à jour récemment", "shelf.changed": "Nouveaux et mis à jour", "shelf.liked": "Les plus aimés",
      "shelf.all": "Tout voir", "shelf.prev": "Précédents dans {title}", "shelf.next": "Plus de {title}",
      "n.likes": ["{n} j'aime", "{n} j'aime"], "n.comments": ["{n} commentaire", "{n} commentaires"], "n.apps": ["{n} app", "{n} apps"],
      "stats.aria": "{likes}, {comments}",
      "copy": "Copier", "copied": "Copié",
      "comments.someone": "quelqu'un", "comments.readall": "Lire les {n} commentaires sur GitHub",
      "app.back": "Toutes les apps", "app.updated": "Mis à jour", "app.reserved": "Réservé", "app.facts": "Infos de la version", "app.status": "Statut",
      "app.like": "J'aime", "app.comment": "Commenter", "app.shared": "L'ID n'est pas unique",
      "app.sharednote": "Une autre app est listée avec le title ID <code>{titleid}</code> : {links}. Une console ne garde qu'une app par title ID : installer celle-ci remplace l'autre, et elles partagent les données de sauvegarde.",
      "comments.title": "Commentaires", "comments.none": "Aucun commentaire pour l'instant. <a data-comments-link href=\"{href}\">Écrivez le premier sur GitHub</a>.",
      "comments.more": "Commenter sur GitHub",
      "install.title": "Installation",
      "install.note": "Lisez d'abord les <a href=\"{release}\">notes de version</a> et la <a href=\"{repo}\">documentation du projet</a>. Certaines apps demandent une configuration supplémentaire, comme un payload, des réglages ou des fichiers additionnels, et les instructions du développeur priment sur les étapes générales ci-dessous.",
      "step.zip.1": "Téléchargez <code>{file}</code> et extrayez-le sur votre ordinateur.",
      "step.zip.2": "Copiez le dossier extrait <code>{titleid}/</code> dans <code>/data/homebrew/</code> sur votre PS5, par exemple via FTP.",
      "step.zip.3": "Un chargeur tel que " + SHADOW + " le détecte. Lancez {name} depuis l'écran d'accueil.",
      "step.img.1": "Téléchargez <code>{file}</code>.",
      "step.img.2": "Copiez le fichier tel quel dans <code>/data/homebrew/</code> sur votre PS5, par exemple via FTP.",
      "step.img.3": SHADOW + " monte l'image. Lancez {name} depuis l'écran d'accueil.",
      "verify.title": "Vérifier", "verify.text": "Cette fiche est liée à un fichier précis. <code>sha256sum {file}</code> doit afficher :",
      "verify.note": "Cette app et son contenu relèvent de la responsabilité de son développeur, {author}. Le homebrew s'exécute avec des droits élevés sur une console jailbreakée ; n'installez que ce en quoi vous avez confiance.",
      "source.title": "Source", "source.release": "Version {tag}",
      "details.title": "Détails", "d.titleid": "Title ID", "d.category": "Catégorie", "d.version": "Version", "d.format": "Format", "d.license": "Licence",
      "d.file": "Fichier", "d.updated": "Mis à jour", "d.status": "Statut", "d.reserved": "Réservé", "d.source": "Source", "d.likes": "J'aime", "d.comments": "Commentaires",
      "panel.kicker": "Obtenir cette app", "panel.ready": "Prête", "panel.note": "Directement depuis la release GitHub du développeur",
      "panel.download": "Télécharger", "panel.source": "Code source",
      "panel.reason": "Liée à un fichier précis par son SHA-256. Comparez-le avant d'installer.",
      "panel.get": "Obtenir cette app", "store.q": "Sur votre PS5 ?", "store.text": "Installez-la et mettez-la à jour depuis le canapé avec ProsperoStore.",
      "soon.title": "Pas encore publiée",
      "soon.text": "{author} a réservé le title ID <code>{titleid}</code> pour ce {kind}. Le téléchargement, le code source et l'icône apparaîtront ici dès que la première version sera listée.",
      "soon.note": "Aucune version n'a encore été publiée", "soon.later": "Elle apparaîtra ici à sa sortie.",
      "notes.title": "Notes de version", "notes.source": "Rédigé par {author} pour {version}. ", "notes.full": "Lire les notes complètes sur GitHub", "notes.see": "Voir cette version sur GitHub",
      "safety.title": "Sécurité", "safety.aria": "Résultats de l'analyse",
      "sb.stays": "Reste dans le sandbox", "sb.stays.text": "L'analyse n'a trouvé aucun moyen pour cette app de sortir de ses propres fichiers : ni payload, ni connexion au chargeur de payloads, ni requête vers un service de jailbreak.",
      "sb.leaves": "Sort du sandbox", "sb.leaves.text": "Cette app peut obtenir un accès complet à la console, généralement pour lire et écrire des fichiers hors de son propre dossier. Ne l'installez que si vous faites confiance à son développeur.",
      "sb.unclear": "Sandbox : incertain", "sb.unclear.text": "L'analyse a relevé de faibles indices que cette app pourrait atteindre le chargeur de payloads, sans pouvoir trancher.",
      "helpers.unrev": ["{n} assistant non vérifié", "{n} assistants non vérifiés"],
      "helpers.unrev.text": ["Elle embarque {n} programme auxiliaire qui s'exécute hors du sandbox ; {u} d'entre eux n'a pas été lu par les mainteneurs du catalogue.", "Elle embarque {n} programmes auxiliaires qui s'exécutent hors du sandbox ; {u} d'entre eux n'ont pas été lus par les mainteneurs du catalogue."],
      "helpers.ok": "Assistants vérifiés",
      "helpers.ok.text": ["Elle embarque {n} programme auxiliaire qui s'exécute hors du sandbox et figure sur la liste des assistants vérifiés du catalogue.", "Elle embarque {n} programmes auxiliaires qui s'exécutent hors du sandbox, tous sur la liste des assistants vérifiés du catalogue."],
      "build.attested": "Construit par GitHub Actions", "build.attested.text": "GitHub détient une attestation signée indiquant qu'un workflow du dépôt de l'app a construit exactement ce fichier.",
      "build.workflow": "Publié par un workflow", "build.workflow.text": "Un workflow du dépôt de l'app a joint ce fichier à la release. Rien ne prouve où il a été construit.",
      "build.developer": "Construit par le développeur", "build.developer.text": "Le développeur a construit et envoyé ce fichier à la main. Rien ne le relie au code source publié.",
      "safety.source": "Issu d'une analyse automatique du fichier de la release, qui est lu et jamais exécuté. Elle peut passer à côté de choses : ce n'est pas une garantie. " + SCAN + "Comment fonctionne l'analyse</a>",
      "lost.kicker": "Erreur 404", "lost.title": "Rien sur cette étagère", "lost.text": "Cette page n'est pas dans le catalogue. L'app a peut-être été renommée ou retirée.",
      "fmt.zip": "Dossier ZIP", "fmt.ffpkg": "Image FFPKG", "fmt.ffpfsc": "Image FFPFSC",
      "kind.app": "App", "kind.game": "Jeu", "kind.tool": "Outil",
      "kindlc.app": "app", "kindlc.game": "jeu", "kindlc.tool": "outil",
      "unlicensed": "Sans licence",
      "cat.console-ports": "Portages de jeux console", "cat.pc-ports": "Portages de jeux PC", "cat.homebrew-games": "Jeux homebrew", "cat.emulators": "Émulateurs",
      "cat.streaming": "Streaming de jeux", "cat.video": "Vidéo et TV", "cat.music": "Musique et audio", "cat.ai": "IA", "cat.utilities": "Utilitaires",
      "cat.tools": "Outils et tests", "cat.showcases": "Démonstrations",
      "tv.title": "PS5 Homebrew — TV", "tv.sort": "Tri", "tv.exit": "Quitter le mode TV", "tv.cats": "Catégories", "tv.empty": "Rien ici pour l'instant.",
      "tv.soonbadge": "Bientôt", "tv.by": "par {author}", "tv.of": "{i} sur {total}",
      "tv.sortedby": "{count} · trié par {sort}",
      "tv.hint.move": "Déplacer", "tv.hint.open": "Ouvrir", "tv.hint.back": "Retour", "tv.hint.sort": "Tri", "tv.hint.menu": "Menu",
      "tv.hint.changesort": "Changer le tri", "tv.hint.exit": "Quitter", "tv.hint.browse": "Parcourir", "tv.hint.language": "Changer de langue", "tv.hint.detail": "Précédent / suivant · défiler",
      "tv.credit": "Maintenu par darkxex, créé par BlackBearReloaded · Construit depuis {short}",
      "tv.reserved": "Ce title ID est réservé par son développeur. L'app n'est pas encore publiée ; elle apparaîtra ici avec un téléchargement dès qu'elle le sera.",
      "tv.scan": "Scannez, ou ouvrez sur votre ordinateur ou téléphone, pour la télécharger :", "tv.hash": "SHA-256 de {file}",
      "tv.releasenote": "Lisez d'abord les notes de version : certaines apps demandent un payload ou une configuration supplémentaire. {author} est seul responsable de cette app et de son contenu.",
      "tv.comments": "Commentaires ({n})",
      "tv.cm.like.scan": "Pour aimer cette app ou la commenter, scannez ce code avec votre téléphone : il ouvre la discussion de l'app sur GitHub, où un compte GitHub est nécessaire.",
      "tv.cm.like.open": "Pour aimer cette app ou la commenter, ouvrez {url} sur votre téléphone : il ouvre la discussion de l'app sur GitHub, où un compte GitHub est nécessaire.",
      "tv.cm.first.scan": "Aucun commentaire pour l'instant. Pour écrire le premier, ou pour aimer cette app, scannez ce code avec votre téléphone : il ouvre la discussion de l'app sur GitHub, où un compte GitHub est nécessaire.",
      "tv.cm.first.open": "Aucun commentaire pour l'instant. Pour écrire le premier, ou pour aimer cette app, ouvrez {url} sur votre téléphone : il ouvre la discussion de l'app sur GitHub, où un compte GitHub est nécessaire.",
      "tv.qr": "QR code de {address}",
      "tv.nojs": "Le mode TV nécessite JavaScript. <a href=\"{base}\">Ouvrir le catalogue classique</a>."
    },

    pt: {
      "brand.from": "Catálogo de PS5",
      "skip": "Ir para o conteúdo", "nav.sections": "Navegação",
      "tab.discover": "Descobrir", "tab.apps": "Apps", "tab.games": "Jogos", "tab.tools": "Ferramentas", "tab.soon": "Em breve", "tab.all": "Tudo",
      "search.label": "Buscar apps", "search.placeholder": "Buscar",
      "link.tv": "Modo TV", "link.submit": "Enviar app",
      "notice.tag": "Novo",
      "notice.text": "<strong>O ProsperoStore chegou.</strong> Navegue, instale e atualize cada app deste catálogo direto do seu PS5. Agora em alfa.",
      "notice.go": "Obtenha no GitHub",
      "foot.catalog": "Catálogo", "foot.publish": "Publicar um app", "foot.policy": "Política de revisão", "foot.report": "Denunciar um app",
      "foot.feed": "Feed JSON", "foot.source": "Código-fonte",
      "foot.fine": "Lista apenas apps homebrew nativos de PS5. Mantido pela comunidade e sem vínculo com a Sony Interactive Entertainment. Os downloads vêm da release do GitHub de cada desenvolvedor; este site não os hospeda. Cada desenvolvedor é o único responsável pela licença e pelo conteúdo do seu app. As listagens são fornecidas no estado em que se encontram, sem garantia, e uma listagem não é uma auditoria de segurança. <a href=\"{repo}#disclaimer\">Aviso legal</a> · Mantido por <a href=\"https://github.com/darkxex\">darkxex</a>, criado por <a href=\"https://github.com/blackbearreloaded\">BlackBearReloaded</a> · Gerado a partir de <a href=\"{repo}/commit/{commit}\">{short}</a>",
      "foot.updated": " · última atualização {time} UTC",
      "lang.label": "Idioma",
      "translate.original": "Mostrar original", "translate.translated": "Mostrar tradução",
      "stage.details": "Ver detalhes", "stage.new": "Nova versão", "stage.featured": "Destaque",
      "heading.home": "Homebrew de PS5", "heading.results": "Resultados para “{q}”",
      "title.home": "PS5 Homebrew Store — apps, jogos e ferramentas da comunidade", "title.suffix": "PS5 Homebrew Store", "title.search": "Busca",
      "sort.title": "Mudar a ordem", "sort.by": "Ordenado por ", "order.name": "Nome", "order.updated": "Atualizados recentemente", "order.liked": "Mais apreciados", "order.author": "Desenvolvedor",
      "empty.title": "Nenhum resultado", "empty.text": "Tente outro nome de app ou desenvolvedor.",
      "cats.label": "Categorias", "cats.all": "Todas",
      "shelf.new": "Novidades no catálogo", "shelf.updated": "Atualizados recentemente", "shelf.changed": "Novos e atualizados", "shelf.liked": "Mais apreciados",
      "shelf.all": "Ver tudo", "shelf.prev": "Anteriores em {title}", "shelf.next": "Mais de {title}",
      "n.likes": ["{n} gosto", "{n} gostos"], "n.comments": ["{n} comentário", "{n} comentários"], "n.apps": ["{n} app", "{n} apps"],
      "stats.aria": "{likes}, {comments}",
      "copy": "Copiar", "copied": "Copiado",
      "comments.someone": "alguém", "comments.readall": "Ler os {n} comentários no GitHub",
      "app.back": "Todos os apps", "app.updated": "Atualizado", "app.reserved": "Reservado", "app.facts": "Dados da versão", "app.status": "Status",
      "app.like": "Gostar", "app.comment": "Comentar", "app.shared": "O ID não é único",
      "app.sharednote": "Outro app está listado com o title ID <code>{titleid}</code>: {links}. Um console guarda um app por title ID, então instalar este substitui o outro e eles compartilham os dados salvos.",
      "comments.title": "Comentários", "comments.none": "Ainda não há comentários. <a data-comments-link href=\"{href}\">Escreva o primeiro no GitHub</a>.",
      "comments.more": "Comentar no GitHub",
      "install.title": "Instalar",
      "install.note": "Leia primeiro as <a href=\"{release}\">notas da versão</a> e a <a href=\"{repo}\">documentação do projeto</a>. Alguns apps exigem configuração extra, como um payload, ajustes ou arquivos adicionais, e as instruções do desenvolvedor têm prioridade sobre os passos gerais abaixo.",
      "step.zip.1": "Faça o download de <code>{file}</code> e extraia no seu computador.",
      "step.zip.2": "Copie a pasta extraída <code>{titleid}/</code> para <code>/data/homebrew/</code> no seu PS5, por exemplo via FTP.",
      "step.zip.3": "Um carregador como " + SHADOW + " a reconhece. Abra {name} a partir do menu inicial.",
      "step.img.1": "Faça o download de <code>{file}</code>.",
      "step.img.2": "Copie o arquivo como está para <code>/data/homebrew/</code> no seu PS5, por exemplo via FTP.",
      "step.img.3": SHADOW + " monta a imagem. Abra {name} a partir do menu inicial.",
      "verify.title": "Verificar", "verify.text": "Esta listagem está fixada a um arquivo exato. <code>sha256sum {file}</code> deve mostrar:",
      "verify.note": "Este app e seu conteúdo são de responsabilidade do desenvolvedor, {author}. Homebrew roda com acesso elevado em um console com jailbreak; instale apenas o que você considera confiável.",
      "source.title": "Código-fonte", "source.release": "Versão {tag}",
      "details.title": "Detalhes", "d.titleid": "Title ID", "d.category": "Categoria", "d.version": "Versão", "d.format": "Formato", "d.license": "Licença",
      "d.file": "Arquivo", "d.updated": "Atualizado", "d.status": "Status", "d.reserved": "Reservado", "d.source": "Código-fonte", "d.likes": "Gostos", "d.comments": "Comentários",
      "panel.kicker": "Obtenha este app", "panel.ready": "Pronto", "panel.note": "Direto da release do GitHub do desenvolvedor",
      "panel.download": "Download", "panel.source": "Código-fonte",
      "panel.reason": "Fixado a um arquivo exato pelo SHA-256. Compare antes de instalar.",
      "panel.get": "Obtenha este app", "store.q": "No seu PS5?", "store.text": "Instale e atualize do sofá com o ProsperoStore.",
      "soon.title": "Ainda não lançado",
      "soon.text": "{author} reservou o title ID <code>{titleid}</code> para este {kind}. O download, o código-fonte e o ícone aparecerão aqui quando a primeira versão for listada.",
      "soon.note": "Nenhuma versão foi publicada ainda", "soon.later": "Aparecerá aqui quando for lançado.",
      "notes.title": "Notas da versão", "notes.source": "Escrito por {author} para {version}. ", "notes.full": "Ler as notas completas no GitHub", "notes.see": "Ver esta versão no GitHub",
      "safety.title": "Segurança", "safety.aria": "Resultados da análise",
      "sb.stays": "Permanece no sandbox", "sb.stays.text": "A análise não encontrou nenhuma forma de este app alcançar além dos próprios arquivos: sem payload, sem conexão com o carregador de payloads, sem requisição a um serviço de jailbreak.",
      "sb.leaves": "Sai do sandbox", "sb.leaves.text": "Este app pode obter acesso total ao console, normalmente para ler e gravar arquivos fora da própria pasta. Instale somente se confiar no desenvolvedor.",
      "sb.unclear": "Sandbox: indefinido", "sb.unclear.text": "A análise encontrou sinais fracos de que este app pode alcançar o carregador de payloads, e não conseguiu confirmar.",
      "helpers.unrev": ["{n} auxiliar não revisado", "{n} auxiliares não revisados"],
      "helpers.unrev.text": ["Inclui {n} programa auxiliar que roda fora do sandbox; {u} deles não foi lido pelos mantenedores do catálogo.", "Inclui {n} programas auxiliares que rodam fora do sandbox; {u} deles não foram lidos pelos mantenedores do catálogo."],
      "helpers.ok": "Auxiliares revisados",
      "helpers.ok.text": ["Inclui {n} programa auxiliar que roda fora do sandbox e consta na lista de auxiliares revisados do catálogo.", "Inclui {n} programas auxiliares que rodam fora do sandbox, todos na lista de auxiliares revisados do catálogo."],
      "build.attested": "Compilado pelo GitHub Actions", "build.attested.text": "O GitHub guarda uma declaração assinada de que um workflow do repositório do app compilou exatamente este arquivo.",
      "build.workflow": "Publicado por um workflow", "build.workflow.text": "Um workflow do repositório do app anexou este arquivo à release. Nada prova onde foi compilado.",
      "build.developer": "Compilado pelo desenvolvedor", "build.developer.text": "O desenvolvedor compilou e enviou este arquivo manualmente. Nada o liga ao código-fonte publicado.",
      "safety.source": "De uma análise automática do arquivo da release, que é lido e nunca executado. Pode deixar passar coisas: não é uma garantia. " + SCAN + "Como a análise funciona</a>",
      "lost.kicker": "Erro 404", "lost.title": "Nada nesta prateleira", "lost.text": "Esta página não está no catálogo. O app pode ter sido renomeado ou retirado.",
      "fmt.zip": "Pasta ZIP", "fmt.ffpkg": "Imagem FFPKG", "fmt.ffpfsc": "Imagem FFPFSC",
      "kind.app": "App", "kind.game": "Jogo", "kind.tool": "Ferramenta",
      "kindlc.app": "app", "kindlc.game": "jogo", "kindlc.tool": "ferramenta",
      "unlicensed": "Sem licença",
      "cat.console-ports": "Ports de jogos de console", "cat.pc-ports": "Ports de jogos de PC", "cat.homebrew-games": "Jogos homebrew", "cat.emulators": "Emuladores",
      "cat.streaming": "Streaming de jogos", "cat.video": "Vídeo e TV", "cat.music": "Música e áudio", "cat.ai": "IA", "cat.utilities": "Utilitários",
      "cat.tools": "Ferramentas e testes", "cat.showcases": "Demonstrações",
      "tv.title": "PS5 Homebrew — TV", "tv.sort": "Ordem", "tv.exit": "Sair do modo TV", "tv.cats": "Categorias", "tv.empty": "Nada aqui ainda.",
      "tv.soonbadge": "Em breve", "tv.by": "por {author}", "tv.of": "{i} de {total}",
      "tv.sortedby": "{count} · ordenado por {sort}",
      "tv.hint.move": "Mover", "tv.hint.open": "Abrir", "tv.hint.back": "Voltar", "tv.hint.sort": "Ordem", "tv.hint.menu": "Menu",
      "tv.hint.changesort": "Mudar ordem", "tv.hint.exit": "Sair", "tv.hint.browse": "Navegar", "tv.hint.language": "Mudar idioma", "tv.hint.detail": "Anterior / próximo · rolar",
      "tv.credit": "Mantido por darkxex, criado por BlackBearReloaded · Gerado a partir de {short}",
      "tv.reserved": "Este title ID foi reservado pelo desenvolvedor. O app ainda não foi lançado; aparecerá aqui com o download quando for.",
      "tv.scan": "Escaneie, ou abra no computador ou telefone, para fazer o download:", "tv.hash": "SHA-256 de {file}",
      "tv.releasenote": "Leia primeiro as notas da versão: alguns apps precisam de um payload ou configuração extra. {author} é o único responsável por este app e seu conteúdo.",
      "tv.comments": "Comentários ({n})",
      "tv.cm.like.scan": "Para gostar deste app ou comentar, escaneie este código com o telefone: ele abre a discussão do app no GitHub, onde é preciso ter uma conta do GitHub.",
      "tv.cm.like.open": "Para gostar deste app ou comentar, abra {url} no telefone: ele abre a discussão do app no GitHub, onde é preciso ter uma conta do GitHub.",
      "tv.cm.first.scan": "Ainda não há comentários. Para escrever o primeiro, ou para gostar deste app, escaneie este código com o telefone: ele abre a discussão do app no GitHub, onde é preciso ter uma conta do GitHub.",
      "tv.cm.first.open": "Ainda não há comentários. Para escrever o primeiro, ou para gostar deste app, abra {url} no telefone: ele abre a discussão do app no GitHub, onde é preciso ter uma conta do GitHub.",
      "tv.qr": "QR code de {address}",
      "tv.nojs": "O modo TV precisa de JavaScript. <a href=\"{base}\">Abrir o catálogo normal</a>."
    },

    ja: {
      "brand.from": "PS5カタログ",
      "skip": "本文へスキップ", "nav.sections": "セクション",
      "tab.discover": "発見", "tab.apps": "アプリ", "tab.games": "ゲーム", "tab.tools": "ツール", "tab.soon": "近日公開", "tab.all": "すべて",
      "search.label": "アプリを検索", "search.placeholder": "検索",
      "link.tv": "TVモード", "link.submit": "アプリを投稿",
      "notice.tag": "新着",
      "notice.text": "<strong>ProsperoStore が登場しました。</strong>このカタログのすべてのアプリを、PS5 から直接閲覧・インストール・更新できます。現在アルファ版です。",
      "notice.go": "GitHubで入手",
      "foot.catalog": "カタログ", "foot.publish": "アプリを公開する", "foot.policy": "審査ポリシー", "foot.report": "アプリを報告",
      "foot.feed": "JSONフィード", "foot.source": "ソース",
      "foot.fine": "PS5ネイティブのホームブリューアプリのみを掲載しています。コミュニティ運営であり、Sony Interactive Entertainment とは関係ありません。ダウンロードは各開発者のGitHubリリースから提供され、このサイトでは配布していません。アプリのライセンスと内容の責任は各開発者が単独で負います。掲載内容は現状有姿で提供され、保証はなく、掲載はセキュリティ監査ではありません。<a href=\"{repo}#disclaimer\">免責事項</a> · 保守: <a href=\"https://github.com/darkxex\">darkxex</a>、作成: <a href=\"https://github.com/blackbearreloaded\">BlackBearReloaded</a> · ビルド元: <a href=\"{repo}/commit/{commit}\">{short}</a>",
      "foot.updated": " · 最終更新 {time} UTC",
      "lang.label": "言語",
      "translate.original": "原文を表示", "translate.translated": "翻訳を表示",
      "stage.details": "詳細を見る", "stage.new": "新リリース", "stage.featured": "注目",
      "heading.home": "PS5 ホームブリュー", "heading.results": "「{q}」の検索結果",
      "title.home": "PS5 Homebrew Store — コミュニティのアプリ、ゲーム、ツール", "title.suffix": "PS5 Homebrew Store", "title.search": "検索",
      "sort.title": "並び順を変更", "sort.by": "並び順: ", "order.name": "名前", "order.updated": "最近更新", "order.liked": "人気順", "order.author": "開発者",
      "empty.title": "該当なし", "empty.text": "別のアプリ名や開発者でお試しください。",
      "cats.label": "カテゴリ", "cats.all": "すべて",
      "shelf.new": "カタログの新着", "shelf.updated": "最近更新", "shelf.changed": "新着・更新", "shelf.liked": "人気",
      "shelf.all": "すべて見る", "shelf.prev": "{title} の前へ", "shelf.next": "{title} の続き",
      "n.likes": "いいね {n}件", "n.comments": "コメント {n}件", "n.apps": "{n} 件のアプリ",
      "stats.aria": "{likes}、{comments}",
      "copy": "コピー", "copied": "コピーしました",
      "comments.someone": "名無し", "comments.readall": "GitHubで {n} 件のコメントをすべて読む",
      "app.back": "すべてのアプリ", "app.updated": "更新", "app.reserved": "予約", "app.facts": "リリース情報", "app.status": "状態",
      "app.like": "いいね", "app.comment": "コメント", "app.shared": "IDが重複しています",
      "app.sharednote": "同じ title ID <code>{titleid}</code> で別のアプリが掲載されています: {links}。本体には title ID ごとに 1 つのアプリしか入らないため、これをインストールするともう一方が置き換えられ、セーブデータも共有されます。",
      "comments.title": "コメント", "comments.none": "まだコメントはありません。<a data-comments-link href=\"{href}\">GitHubで最初のコメントを書く</a>。",
      "comments.more": "GitHubでコメントする",
      "install.title": "インストール",
      "install.note": "まず<a href=\"{release}\">リリースノート</a>と<a href=\"{repo}\">プロジェクトのドキュメント</a>をお読みください。アプリによってはペイロード、設定、追加ファイルなどの準備が必要で、開発者の指示は以下の一般的な手順より優先されます。",
      "step.zip.1": "<code>{file}</code> をダウンロードし、パソコンで展開します。",
      "step.zip.2": "展開した <code>{titleid}/</code> フォルダを、FTPなどで PS5 の <code>/data/homebrew/</code> にコピーします。",
      "step.zip.3": SHADOW + " などのローダーが認識します。ホーム画面から {name} を起動してください。",
      "step.img.1": "<code>{file}</code> をダウンロードします。",
      "step.img.2": "ファイルをそのまま、FTPなどで PS5 の <code>/data/homebrew/</code> にコピーします。",
      "step.img.3": SHADOW + " がイメージをマウントします。ホーム画面から {name} を起動してください。",
      "verify.title": "検証", "verify.text": "この掲載は特定の 1 ファイルに固定されています。<code>sha256sum {file}</code> の出力は次と一致する必要があります:",
      "verify.note": "このアプリとその内容の責任は開発者の {author} にあります。ホームブリューは脱獄したコンソール上で高い権限で動作します。信頼できるものだけをインストールしてください。",
      "source.title": "ソース", "source.release": "リリース {tag}",
      "details.title": "詳細", "d.titleid": "Title ID", "d.category": "カテゴリ", "d.version": "バージョン", "d.format": "形式", "d.license": "ライセンス",
      "d.file": "ファイル", "d.updated": "更新日", "d.status": "状態", "d.reserved": "予約日", "d.source": "ソース", "d.likes": "いいね", "d.comments": "コメント",
      "panel.kicker": "このアプリを入手", "panel.ready": "準備完了", "panel.note": "開発者のGitHubリリースから直接ダウンロード",
      "panel.download": "ダウンロード", "panel.source": "ソースコード",
      "panel.reason": "SHA-256 で特定の 1 ファイルに固定されています。インストール前に照合してください。",
      "panel.get": "このアプリを入手", "store.q": "PS5をお使いですか?", "store.text": "ProsperoStore なら、ソファに座ったままインストールと更新ができます。",
      "soon.title": "未リリース",
      "soon.text": "{author} がこの{kind}のために title ID <code>{titleid}</code> を予約しました。最初のリリースが掲載されると、ダウンロード、ソース、アイコンがここに表示されます。",
      "soon.note": "まだリリースは公開されていません", "soon.later": "リリースされるとここに表示されます。",
      "notes.title": "リリースノート", "notes.source": "{author} が {version} について執筆。", "notes.full": "GitHubで全文を読む", "notes.see": "GitHubでこのリリースを見る",
      "safety.title": "安全性", "safety.aria": "スキャン結果",
      "sb.stays": "サンドボックス内に留まる", "sb.stays.text": "スキャンでは、このアプリが自身のファイルの外に到達する手段は見つかりませんでした。ペイロードも、ペイロードローダーへの接続も、脱獄サービスへのリクエストもありません。",
      "sb.leaves": "サンドボックスを出る", "sb.leaves.text": "このアプリは本体への完全なアクセスを得られ、通常は自身のフォルダ外のファイルの読み書きに使われます。開発者を信頼できる場合のみインストールしてください。",
      "sb.unclear": "サンドボックス: 不明", "sb.unclear.text": "スキャンで、このアプリがペイロードローダーに到達する可能性を示す弱い兆候が見つかりましたが、断定できませんでした。",
      "helpers.unrev": "未審査のヘルパー {n} 件",
      "helpers.unrev.text": "サンドボックス外で動作するヘルパープログラムを {n} 個含み、そのうち {u} 個はカタログの管理者が確認していません。",
      "helpers.ok": "ヘルパー審査済み",
      "helpers.ok.text": "サンドボックス外で動作するヘルパープログラムを {n} 個含み、すべてカタログの審査済みヘルパー一覧に載っています。",
      "build.attested": "GitHub Actions でビルド", "build.attested.text": "アプリのリポジトリのワークフローがこのファイルそのものをビルドしたことを示す署名付き証明を、GitHubが保持しています。",
      "build.workflow": "ワークフローがリリース", "build.workflow.text": "アプリのリポジトリのワークフローがこのファイルをリリースに添付しました。どこでビルドされたかを示すものはありません。",
      "build.developer": "開発者がビルド", "build.developer.text": "開発者が手作業でこのファイルをビルドしてアップロードしました。公開されているソースとの関連を示すものはありません。",
      "safety.source": "リリースファイルの自動スキャンによる結果です。ファイルは読み取るだけで実行はしません。見落としもあり得るため、保証ではありません。" + SCAN + "スキャンの仕組み</a>",
      "lost.kicker": "エラー 404", "lost.title": "この棚には何もありません", "lost.text": "このページはカタログにありません。アプリの名前が変わったか、取り下げられた可能性があります。",
      "fmt.zip": "ZIPフォルダ", "fmt.ffpkg": "FFPKGイメージ", "fmt.ffpfsc": "FFPFSCイメージ",
      "kind.app": "アプリ", "kind.game": "ゲーム", "kind.tool": "ツール",
      "kindlc.app": "アプリ", "kindlc.game": "ゲーム", "kindlc.tool": "ツール",
      "unlicensed": "ライセンスなし",
      "cat.console-ports": "家庭用ゲーム移植", "cat.pc-ports": "PCゲーム移植", "cat.homebrew-games": "ホームブリューゲーム", "cat.emulators": "エミュレーター",
      "cat.streaming": "ゲームストリーミング", "cat.video": "動画・TV", "cat.music": "音楽・オーディオ", "cat.ai": "AI", "cat.utilities": "ユーティリティ",
      "cat.tools": "ツール・テスト", "cat.showcases": "ショーケース",
      "tv.title": "PS5 Homebrew — TV", "tv.sort": "並び替え", "tv.exit": "TVモードを終了", "tv.cats": "カテゴリ", "tv.empty": "まだ何もありません。",
      "tv.soonbadge": "近日", "tv.by": "開発: {author}", "tv.of": "{i} / {total}",
      "tv.sortedby": "{count} · 並び順: {sort}",
      "tv.hint.move": "移動", "tv.hint.open": "開く", "tv.hint.back": "戻る", "tv.hint.sort": "並び替え", "tv.hint.menu": "メニュー",
      "tv.hint.changesort": "並び順を変更", "tv.hint.exit": "終了", "tv.hint.browse": "閲覧", "tv.hint.language": "言語を変更", "tv.hint.detail": "前へ / 次へ · スクロール",
      "tv.credit": "保守: darkxex、作成: BlackBearReloaded · ビルド元: {short}",
      "tv.reserved": "この title ID は開発者によって予約されています。アプリはまだ公開されておらず、公開されるとダウンロードとともにここに表示されます。",
      "tv.scan": "スキャンするか、パソコンやスマートフォンで開いてダウンロード:", "tv.hash": "{file} の SHA-256",
      "tv.releasenote": "まずリリースノートをお読みください。アプリによってはペイロードや追加設定が必要です。このアプリとその内容の責任は {author} が単独で負います。",
      "tv.comments": "コメント ({n})",
      "tv.cm.like.scan": "このアプリにいいね・コメントするには、スマートフォンでこのコードをスキャンしてください。GitHub上のアプリのディスカッションが開きます(GitHubアカウントが必要です)。",
      "tv.cm.like.open": "このアプリにいいね・コメントするには、スマートフォンで {url} を開いてください。GitHub上のアプリのディスカッションが開きます(GitHubアカウントが必要です)。",
      "tv.cm.first.scan": "まだコメントはありません。最初のコメントやいいねは、スマートフォンでこのコードをスキャンしてください。GitHub上のアプリのディスカッションが開きます(GitHubアカウントが必要です)。",
      "tv.cm.first.open": "まだコメントはありません。最初のコメントやいいねは、スマートフォンで {url} を開いてください。GitHub上のアプリのディスカッションが開きます(GitHubアカウントが必要です)。",
      "tv.qr": "{address} のQRコード",
      "tv.nojs": "TVモードにはJavaScriptが必要です。<a href=\"{base}\">通常のカタログを開く</a>。"
    },

    de: {
      "brand.from": "PS5-Katalog",
      "skip": "Zum Inhalt springen", "nav.sections": "Bereiche",
      "tab.discover": "Entdecken", "tab.apps": "Apps", "tab.games": "Spiele", "tab.tools": "Tools", "tab.soon": "Demnächst", "tab.all": "Alle",
      "search.label": "Apps suchen", "search.placeholder": "Suchen",
      "link.tv": "TV-Modus", "link.submit": "App einreichen",
      "notice.tag": "Neu",
      "notice.text": "<strong>ProsperoStore ist da.</strong> Durchsuche, installiere und aktualisiere jede App dieses Katalogs direkt auf deiner PS5. Jetzt in der Alpha.",
      "notice.go": "Auf GitHub herunterladen",
      "foot.catalog": "Katalog", "foot.publish": "App veröffentlichen", "foot.policy": "Prüfrichtlinie", "foot.report": "App melden",
      "foot.feed": "JSON-Feed", "foot.source": "Quellcode",
      "foot.fine": "Listet nur native PS5-Homebrew-Apps. Von der Community betrieben und nicht mit Sony Interactive Entertainment verbunden. Die Downloads stammen aus dem GitHub-Release des jeweiligen Entwicklers; diese Seite hostet sie nicht. Jeder Entwickler ist allein für Lizenz und Inhalt seiner App verantwortlich. Einträge werden ohne Gewähr bereitgestellt, und ein Eintrag ist kein Sicherheitsaudit. <a href=\"{repo}#disclaimer\">Haftungsausschluss</a> · Betreut von <a href=\"https://github.com/darkxex\">darkxex</a>, erstellt von <a href=\"https://github.com/blackbearreloaded\">BlackBearReloaded</a> · Erstellt aus <a href=\"{repo}/commit/{commit}\">{short}</a>",
      "foot.updated": " · zuletzt aktualisiert {time} UTC",
      "lang.label": "Sprache",
      "translate.original": "Original anzeigen", "translate.translated": "Übersetzung anzeigen",
      "stage.details": "Details ansehen", "stage.new": "Neues Release", "stage.featured": "Empfohlen",
      "heading.home": "PS5-Homebrew", "heading.results": "Ergebnisse für „{q}“",
      "title.home": "PS5 Homebrew Store — Apps, Spiele und Tools der Community", "title.suffix": "PS5 Homebrew Store", "title.search": "Suche",
      "sort.title": "Reihenfolge ändern", "sort.by": "Sortiert nach ", "order.name": "Name", "order.updated": "Kürzlich aktualisiert", "order.liked": "Beliebteste", "order.author": "Entwickler",
      "empty.title": "Keine Treffer", "empty.text": "Versuche einen anderen App- oder Entwicklernamen.",
      "cats.label": "Kategorien", "cats.all": "Alle",
      "shelf.new": "Neu im Katalog", "shelf.updated": "Kürzlich aktualisiert", "shelf.changed": "Neu und aktualisiert", "shelf.liked": "Beliebteste",
      "shelf.all": "Alle anzeigen", "shelf.prev": "Frühere in {title}", "shelf.next": "Mehr aus {title}",
      "n.likes": ["{n} Like", "{n} Likes"], "n.comments": ["{n} Kommentar", "{n} Kommentare"], "n.apps": ["{n} App", "{n} Apps"],
      "stats.aria": "{likes}, {comments}",
      "copy": "Kopieren", "copied": "Kopiert",
      "comments.someone": "jemand", "comments.readall": "Alle {n} Kommentare auf GitHub lesen",
      "app.back": "Alle Apps", "app.updated": "Aktualisiert", "app.reserved": "Reserviert", "app.facts": "Release-Infos", "app.status": "Status",
      "app.like": "Gefällt mir", "app.comment": "Kommentieren", "app.shared": "Die ID ist nicht eindeutig",
      "app.sharednote": "Eine andere App ist mit der Title ID <code>{titleid}</code> gelistet: {links}. Eine Konsole speichert nur eine App pro Title ID. Die Installation dieser App ersetzt die andere, und beide teilen sich die Spielstände.",
      "comments.title": "Kommentare", "comments.none": "Noch keine Kommentare. <a data-comments-link href=\"{href}\">Schreibe den ersten auf GitHub</a>.",
      "comments.more": "Auf GitHub kommentieren",
      "install.title": "Installieren",
      "install.note": "Lies zuerst die <a href=\"{release}\">Release-Notes</a> und die <a href=\"{repo}\">Dokumentation des Projekts</a>. Manche Apps brauchen zusätzliche Einrichtung, etwa einen Payload, Konfiguration oder weitere Dateien; die Anweisungen des Entwicklers haben Vorrang vor den allgemeinen Schritten unten.",
      "step.zip.1": "Lade <code>{file}</code> herunter und entpacke es auf deinem Computer.",
      "step.zip.2": "Kopiere den entpackten Ordner <code>{titleid}/</code> nach <code>/data/homebrew/</code> auf deiner PS5, zum Beispiel per FTP.",
      "step.zip.3": "Ein Loader wie " + SHADOW + " erkennt ihn. Starte {name} über den Startbildschirm.",
      "step.img.1": "Lade <code>{file}</code> herunter.",
      "step.img.2": "Kopiere die Datei unverändert nach <code>/data/homebrew/</code> auf deiner PS5, zum Beispiel per FTP.",
      "step.img.3": SHADOW + " bindet das Image ein. Starte {name} über den Startbildschirm.",
      "verify.title": "Überprüfen", "verify.text": "Dieser Eintrag ist an eine ganz bestimmte Datei gebunden. <code>sha256sum {file}</code> muss ausgeben:",
      "verify.note": "Diese App und ihr Inhalt liegen in der Verantwortung ihres Entwicklers, {author}. Homebrew läuft auf einer gejailbreakten Konsole mit erweiterten Rechten; installiere nur, was du für vertrauenswürdig hältst.",
      "source.title": "Quelle", "source.release": "Release {tag}",
      "details.title": "Details", "d.titleid": "Title ID", "d.category": "Kategorie", "d.version": "Version", "d.format": "Format", "d.license": "Lizenz",
      "d.file": "Datei", "d.updated": "Aktualisiert", "d.status": "Status", "d.reserved": "Reserviert", "d.source": "Quelle", "d.likes": "Likes", "d.comments": "Kommentare",
      "panel.kicker": "Diese App holen", "panel.ready": "Bereit", "panel.note": "Direkt aus dem GitHub-Release des Entwicklers",
      "panel.download": "Herunterladen", "panel.source": "Quellcode",
      "panel.reason": "Über den SHA-256 an eine ganz bestimmte Datei gebunden. Vergleiche ihn vor der Installation.",
      "panel.get": "Diese App holen", "store.q": "Auf deiner PS5?", "store.text": "Mit ProsperoStore bequem vom Sofa aus installieren und aktualisieren.",
      "soon.title": "Noch nicht veröffentlicht",
      "soon.text": "{author} hat die Title ID <code>{titleid}</code> für dieses Element ({kind}) reserviert. Download, Quellcode und Icon erscheinen hier, sobald das erste Release gelistet ist.",
      "soon.note": "Es wurde noch kein Release veröffentlicht", "soon.later": "Es erscheint hier, sobald es veröffentlicht ist.",
      "notes.title": "Release-Notes", "notes.source": "Geschrieben von {author} für {version}. ", "notes.full": "Vollständige Notes auf GitHub lesen", "notes.see": "Dieses Release auf GitHub ansehen",
      "safety.title": "Sicherheit", "safety.aria": "Scan-Ergebnisse",
      "sb.stays": "Bleibt in der Sandbox", "sb.stays.text": "Der Scan hat keinen Weg gefunden, wie diese App über ihre eigenen Dateien hinausreichen könnte: kein Payload, keine Verbindung zum Payload-Loader, keine Anfrage an einen Jailbreak-Dienst.",
      "sb.leaves": "Verlässt die Sandbox", "sb.leaves.text": "Diese App kann vollen Zugriff auf die Konsole erhalten, meist um Dateien außerhalb ihres eigenen Ordners zu lesen und zu schreiben. Installiere sie nur, wenn du ihrem Entwickler vertraust.",
      "sb.unclear": "Sandbox: unklar", "sb.unclear.text": "Der Scan hat schwache Hinweise gefunden, dass diese App den Payload-Loader erreichen könnte, konnte es aber nicht klären.",
      "helpers.unrev": ["{n} Helfer nicht geprüft", "{n} Helfer nicht geprüft"],
      "helpers.unrev.text": ["Sie enthält {n} Hilfsprogramm, das außerhalb der Sandbox läuft; {u} davon haben die Betreuer des Katalogs nicht gelesen.", "Sie enthält {n} Hilfsprogramme, die außerhalb der Sandbox laufen; {u} davon haben die Betreuer des Katalogs nicht gelesen."],
      "helpers.ok": "Helfer geprüft",
      "helpers.ok.text": ["Sie enthält {n} Hilfsprogramm, das außerhalb der Sandbox läuft und auf der Liste der geprüften Helfer des Katalogs steht.", "Sie enthält {n} Hilfsprogramme, die außerhalb der Sandbox laufen, alle auf der Liste der geprüften Helfer des Katalogs."],
      "build.attested": "Von GitHub Actions gebaut", "build.attested.text": "GitHub besitzt eine signierte Bestätigung, dass ein Workflow im Repository der App genau diese Datei gebaut hat.",
      "build.workflow": "Von einem Workflow veröffentlicht", "build.workflow.text": "Ein Workflow im Repository der App hat diese Datei dem Release angehängt. Nichts belegt, wo sie gebaut wurde.",
      "build.developer": "Vom Entwickler gebaut", "build.developer.text": "Der Entwickler hat diese Datei von Hand gebaut und hochgeladen. Nichts verbindet sie mit dem veröffentlichten Quellcode.",
      "safety.source": "Ergebnis eines automatischen Scans der Release-Datei, die nur gelesen und nie ausgeführt wird. Er kann etwas übersehen: Er ist keine Garantie. " + SCAN + "So funktioniert der Scan</a>",
      "lost.kicker": "Fehler 404", "lost.title": "Nichts in diesem Regal", "lost.text": "Diese Seite ist nicht im Katalog. Die App wurde möglicherweise umbenannt oder zurückgezogen.",
      "fmt.zip": "ZIP-Ordner", "fmt.ffpkg": "FFPKG-Image", "fmt.ffpfsc": "FFPFSC-Image",
      "kind.app": "App", "kind.game": "Spiel", "kind.tool": "Tool",
      "kindlc.app": "App", "kindlc.game": "Spiel", "kindlc.tool": "Tool",
      "unlicensed": "Ohne Lizenz",
      "cat.console-ports": "Konsolenspiel-Portierungen", "cat.pc-ports": "PC-Spiel-Portierungen", "cat.homebrew-games": "Homebrew-Spiele", "cat.emulators": "Emulatoren",
      "cat.streaming": "Spiele-Streaming", "cat.video": "Video & TV", "cat.music": "Musik & Audio", "cat.ai": "KI", "cat.utilities": "Dienstprogramme",
      "cat.tools": "Tools & Tests", "cat.showcases": "Showcases",
      "tv.title": "PS5 Homebrew — TV", "tv.sort": "Sortierung", "tv.exit": "TV-Modus beenden", "tv.cats": "Kategorien", "tv.empty": "Hier ist noch nichts.",
      "tv.soonbadge": "Bald", "tv.by": "von {author}", "tv.of": "{i} von {total}",
      "tv.sortedby": "{count} · sortiert nach {sort}",
      "tv.hint.move": "Bewegen", "tv.hint.open": "Öffnen", "tv.hint.back": "Zurück", "tv.hint.sort": "Sortierung", "tv.hint.menu": "Menü",
      "tv.hint.changesort": "Sortierung ändern", "tv.hint.exit": "Beenden", "tv.hint.browse": "Durchsuchen", "tv.hint.language": "Sprache ändern", "tv.hint.detail": "Zurück / weiter · scrollen",
      "tv.credit": "Betreut von darkxex, erstellt von BlackBearReloaded · Erstellt aus {short}",
      "tv.reserved": "Diese Title ID ist von ihrem Entwickler reserviert. Die App ist noch nicht veröffentlicht; sie erscheint hier mit Download, sobald sie es ist.",
      "tv.scan": "Scannen oder auf Computer oder Smartphone öffnen, um sie herunterzuladen:", "tv.hash": "SHA-256 von {file}",
      "tv.releasenote": "Lies zuerst die Release-Notes: Manche Apps brauchen einen Payload oder zusätzliche Einrichtung. {author} ist allein für diese App und ihren Inhalt verantwortlich.",
      "tv.comments": "Kommentare ({n})",
      "tv.cm.like.scan": "Um diese App zu liken oder zu kommentieren, scanne diesen Code mit dem Smartphone: Er öffnet die Diskussion der App auf GitHub, wo ein GitHub-Konto nötig ist.",
      "tv.cm.like.open": "Um diese App zu liken oder zu kommentieren, öffne {url} auf dem Smartphone: Es öffnet die Diskussion der App auf GitHub, wo ein GitHub-Konto nötig ist.",
      "tv.cm.first.scan": "Noch keine Kommentare. Um den ersten zu schreiben oder diese App zu liken, scanne diesen Code mit dem Smartphone: Er öffnet die Diskussion der App auf GitHub, wo ein GitHub-Konto nötig ist.",
      "tv.cm.first.open": "Noch keine Kommentare. Um den ersten zu schreiben oder diese App zu liken, öffne {url} auf dem Smartphone: Es öffnet die Diskussion der App auf GitHub, wo ein GitHub-Konto nötig ist.",
      "tv.qr": "QR-Code für {address}",
      "tv.nojs": "Der TV-Modus benötigt JavaScript. <a href=\"{base}\">Den normalen Katalog öffnen</a>."
    },
    nl: {
      "brand.from": "PS5-catalogus",
      "skip": "Naar de inhoud", "nav.sections": "Secties",
      "tab.discover": "Ontdekken", "tab.apps": "Apps", "tab.games": "Games", "tab.tools": "Tools", "tab.soon": "Binnenkort", "tab.all": "Alles",
      "search.label": "Apps zoeken", "search.placeholder": "Zoeken",
      "link.tv": "TV-modus", "link.submit": "App indienen",
      "notice.tag": "Nieuw",
      "notice.text": "<strong>ProsperoStore is er.</strong> Bekijk, installeer en update elke app uit deze catalogus rechtstreeks op je PS5. Nu in alfa.",
      "notice.go": "Haal het op GitHub",
      "foot.catalog": "Catalogus", "foot.publish": "Een app publiceren", "foot.policy": "Beoordelingsbeleid", "foot.report": "Een app melden",
      "foot.feed": "JSON-feed", "foot.source": "Broncode",
      "foot.fine": "Bevat alleen native PS5-homebrew-apps. Beheerd door de community en niet verbonden aan Sony Interactive Entertainment. Downloads komen uit de eigen GitHub-release van elke ontwikkelaar; deze site host ze niet. Elke ontwikkelaar is zelf verantwoordelijk voor de licentie en inhoud van zijn of haar app. Vermeldingen worden geleverd zoals ze zijn, zonder garantie, en een vermelding is geen beveiligingsaudit. <a href=\"{repo}#disclaimer\">Disclaimer</a> · Onderhouden door <a href=\"https://github.com/darkxex\">darkxex</a>, gemaakt door <a href=\"https://github.com/blackbearreloaded\">BlackBearReloaded</a> · Gebouwd vanuit <a href=\"{repo}/commit/{commit}\">{short}</a>",
      "foot.updated": " · laatst bijgewerkt {time} UTC",
      "lang.label": "Taal",
      "translate.original": "Origineel tonen", "translate.translated": "Vertaling tonen",
      "stage.details": "Details bekijken", "stage.new": "Nieuwe release", "stage.featured": "Uitgelicht",
      "heading.home": "PS5-homebrew", "heading.results": "Resultaten voor “{q}”",
      "title.home": "PS5 Homebrew Store — apps, games en tools van de community", "title.suffix": "PS5 Homebrew Store", "title.search": "Zoeken",
      "sort.title": "Volgorde wijzigen", "sort.by": "Gesorteerd op ", "order.name": "Naam", "order.updated": "Recent bijgewerkt", "order.liked": "Meest geliket", "order.author": "Ontwikkelaar",
      "empty.title": "Geen resultaten", "empty.text": "Probeer een andere app- of ontwikkelaarsnaam.",
      "cats.label": "Categorieën", "cats.all": "Alle",
      "shelf.new": "Nieuw in de catalogus", "shelf.updated": "Recent bijgewerkt", "shelf.changed": "Nieuw en bijgewerkt", "shelf.liked": "Meest geliket",
      "shelf.all": "Alles bekijken", "shelf.prev": "Eerder in {title}", "shelf.next": "Meer van {title}",
      "n.likes": ["{n} like", "{n} likes"], "n.comments": ["{n} reactie", "{n} reacties"], "n.apps": ["{n} app", "{n} apps"],
      "stats.aria": "{likes}, {comments}",
      "copy": "Kopiëren", "copied": "Gekopieerd",
      "comments.someone": "iemand", "comments.readall": "Alle {n} reacties op GitHub lezen",
      "app.back": "Alle apps", "app.updated": "Bijgewerkt", "app.reserved": "Gereserveerd", "app.facts": "Releasegegevens", "app.status": "Status",
      "app.like": "Liken", "app.comment": "Reageren", "app.shared": "De ID is niet uniek",
      "app.sharednote": "Een andere app staat vermeld met de title ID <code>{titleid}</code>: {links}. Een console bewaart één app per title ID, dus als je deze installeert, wordt de andere vervangen en delen ze opgeslagen gegevens.",
      "comments.title": "Reacties", "comments.none": "Nog geen reacties. <a data-comments-link href=\"{href}\">Schrijf de eerste op GitHub</a>.",
      "comments.more": "Reageren op GitHub",
      "install.title": "Installeren",
      "install.note": "Lees eerst de <a href=\"{release}\">releasenotes</a> en de <a href=\"{repo}\">documentatie van het project</a>. Sommige apps vereisen extra instellingen, zoals een payload, configuratie of aanvullende bestanden, en de instructies van de ontwikkelaar gaan voor op de algemene stappen hieronder.",
      "step.zip.1": "Download <code>{file}</code> en pak het uit op je pc.",
      "step.zip.2": "Kopieer de uitgepakte map <code>{titleid}/</code> naar <code>/data/homebrew/</code> op je PS5, bijvoorbeeld via FTP.",
      "step.zip.3": "Een loader zoals " + SHADOW + " pakt hem op. Start {name} vanaf het startscherm.",
      "step.img.1": "Download <code>{file}</code>.",
      "step.img.2": "Kopieer het bestand ongewijzigd naar <code>/data/homebrew/</code> op je PS5, bijvoorbeeld via FTP.",
      "step.img.3": SHADOW + " koppelt de image. Start {name} vanaf het startscherm.",
      "verify.title": "Controleren", "verify.text": "Deze vermelding is vastgezet op één specifiek bestand. <code>sha256sum {file}</code> moet het volgende tonen:",
      "verify.note": "Deze app en de inhoud ervan vallen onder de verantwoordelijkheid van de ontwikkelaar, {author}. Homebrew draait met verhoogde rechten op een gejailbreakte console; installeer alleen wat je vertrouwt.",
      "source.title": "Bron", "source.release": "Release {tag}",
      "details.title": "Details", "d.titleid": "Title ID", "d.category": "Categorie", "d.version": "Versie", "d.format": "Formaat", "d.license": "Licentie",
      "d.file": "Bestand", "d.updated": "Bijgewerkt", "d.status": "Status", "d.reserved": "Gereserveerd", "d.source": "Bron", "d.likes": "Likes", "d.comments": "Reacties",
      "panel.kicker": "Haal deze app", "panel.ready": "Klaar", "panel.note": "Rechtstreeks uit de GitHub-release van de ontwikkelaar",
      "panel.download": "Downloaden", "panel.source": "Broncode",
      "panel.reason": "Via de SHA-256 vastgezet op één specifiek bestand. Vergelijk hem vóór het installeren.",
      "panel.get": "Haal deze app", "store.q": "Op je PS5?", "store.text": "Installeer en update hem vanaf de bank met ProsperoStore.",
      "soon.title": "Nog niet uitgebracht",
      "soon.text": "{author} heeft de title ID <code>{titleid}</code> gereserveerd voor dit item ({kind}). Download, broncode en pictogram verschijnen hier zodra de eerste release is vermeld.",
      "soon.note": "Er is nog geen release gepubliceerd", "soon.later": "Hij verschijnt hier zodra hij is uitgebracht.",
      "notes.title": "Releasenotes", "notes.source": "Geschreven door {author} voor {version}. ", "notes.full": "Lees de volledige notes op GitHub", "notes.see": "Bekijk deze release op GitHub",
      "safety.title": "Veiligheid", "safety.aria": "Scanresultaten",
      "sb.stays": "Blijft in de sandbox", "sb.stays.text": "De scan vond geen manier waarop deze app buiten haar eigen bestanden kan komen: geen payload, geen verbinding met de payload-loader, geen verzoek aan een jailbreakdienst.",
      "sb.leaves": "Verlaat de sandbox", "sb.leaves.text": "Deze app kan volledige toegang tot de console krijgen, meestal om bestanden buiten haar eigen map te lezen en te schrijven. Installeer haar alleen als je de ontwikkelaar vertrouwt.",
      "sb.unclear": "Sandbox: onduidelijk", "sb.unclear.text": "De scan vond zwakke aanwijzingen dat deze app de payload-loader kan bereiken, maar kon dit niet vaststellen.",
      "helpers.unrev": ["{n} hulpprogramma niet beoordeeld", "{n} hulpprogramma's niet beoordeeld"],
      "helpers.unrev.text": ["Bevat {n} hulpprogramma dat buiten de sandbox draait; {u} daarvan is niet gelezen door de beheerders van de catalogus.", "Bevat {n} hulpprogramma's die buiten de sandbox draaien; {u} daarvan zijn niet gelezen door de beheerders van de catalogus."],
      "helpers.ok": "Hulpprogramma's beoordeeld",
      "helpers.ok.text": ["Bevat {n} hulpprogramma dat buiten de sandbox draait en op de lijst van beoordeelde hulpprogramma's van de catalogus staat.", "Bevat {n} hulpprogramma's die buiten de sandbox draaien, allemaal op de lijst van beoordeelde hulpprogramma's van de catalogus."],
      "build.attested": "Gebouwd door GitHub Actions", "build.attested.text": "GitHub heeft een ondertekende verklaring dat een workflow van de repository van de app precies dit bestand heeft gebouwd.",
      "build.workflow": "Uitgebracht door een workflow", "build.workflow.text": "Een workflow van de repository van de app heeft dit bestand aan de release toegevoegd. Niets bewijst waar het is gebouwd.",
      "build.developer": "Gebouwd door de ontwikkelaar", "build.developer.text": "De ontwikkelaar heeft dit bestand handmatig gebouwd en geüpload. Niets koppelt het aan de gepubliceerde broncode.",
      "safety.source": "Resultaat van een automatische scan van het releasebestand, dat alleen wordt gelezen en nooit uitgevoerd. Er kan iets aan ontsnappen: het is geen garantie. " + SCAN + "Hoe de scan werkt</a>",
      "lost.kicker": "Fout 404", "lost.title": "Niets op deze plank", "lost.text": "Deze pagina staat niet in de catalogus. De app is mogelijk hernoemd of ingetrokken.",
      "fmt.zip": "ZIP-map", "fmt.ffpkg": "FFPKG-image", "fmt.ffpfsc": "FFPFSC-image",
      "kind.app": "App", "kind.game": "Game", "kind.tool": "Tool",
      "kindlc.app": "app", "kindlc.game": "game", "kindlc.tool": "tool",
      "unlicensed": "Geen licentie",
      "cat.console-ports": "Consolegame-ports", "cat.pc-ports": "Pc-game-ports", "cat.homebrew-games": "Homebrew-games", "cat.emulators": "Emulators",
      "cat.streaming": "Game-streaming", "cat.video": "Video & tv", "cat.music": "Muziek & audio", "cat.ai": "AI", "cat.utilities": "Hulpprogramma's",
      "cat.tools": "Tools & tests", "cat.showcases": "Showcases",
      "tv.title": "PS5 Homebrew — TV", "tv.sort": "Sortering", "tv.exit": "TV-modus verlaten", "tv.cats": "Categorieën", "tv.empty": "Hier is nog niets.",
      "tv.soonbadge": "Binnenkort", "tv.by": "door {author}", "tv.of": "{i} van {total}",
      "tv.sortedby": "{count} · gesorteerd op {sort}",
      "tv.hint.move": "Bewegen", "tv.hint.open": "Openen", "tv.hint.back": "Terug", "tv.hint.sort": "Sortering", "tv.hint.menu": "Menu",
      "tv.hint.changesort": "Sortering wijzigen", "tv.hint.exit": "Verlaten", "tv.hint.browse": "Bladeren", "tv.hint.language": "Taal wijzigen", "tv.hint.detail": "Vorige / volgende · scrollen",
      "tv.credit": "Onderhouden door darkxex, gemaakt door BlackBearReloaded · Gebouwd vanuit {short}",
      "tv.reserved": "Deze title ID is gereserveerd door de ontwikkelaar. De app is nog niet uitgebracht; hij verschijnt hier met een download zodra dat zo is.",
      "tv.scan": "Scan, of open op je computer of telefoon, om te downloaden:", "tv.hash": "SHA-256 van {file}",
      "tv.releasenote": "Lees eerst de releasenotes: sommige apps hebben een payload of extra instellingen nodig. {author} is als enige verantwoordelijk voor deze app en de inhoud ervan.",
      "tv.comments": "Reacties ({n})",
      "tv.cm.like.scan": "Om deze app te liken of erop te reageren, scan je deze code met je telefoon: de discussie van de app op GitHub opent, waar een GitHub-account nodig is.",
      "tv.cm.like.open": "Om deze app te liken of erop te reageren, open je {url} op je telefoon: de discussie van de app op GitHub opent, waar een GitHub-account nodig is.",
      "tv.cm.first.scan": "Nog geen reacties. Om de eerste te schrijven, of om deze app te liken, scan je deze code met je telefoon: de discussie van de app op GitHub opent, waar een GitHub-account nodig is.",
      "tv.cm.first.open": "Nog geen reacties. Om de eerste te schrijven, of om deze app te liken, open je {url} op je telefoon: de discussie van de app op GitHub opent, waar een GitHub-account nodig is.",
      "tv.qr": "QR-code voor {address}",
      "tv.nojs": "De TV-modus heeft JavaScript nodig. <a href=\"{base}\">Open de gewone catalogus</a>."
    },

    tr: {
      "brand.from": "PS5 kataloğu",
      "skip": "İçeriğe geç", "nav.sections": "Bölümler",
      "tab.discover": "Keşfet", "tab.apps": "Uygulamalar", "tab.games": "Oyunlar", "tab.tools": "Araçlar", "tab.soon": "Yakında", "tab.all": "Tümü",
      "search.label": "Uygulama ara", "search.placeholder": "Ara",
      "link.tv": "TV modu", "link.submit": "Uygulama gönder",
      "notice.tag": "Yeni",
      "notice.text": "<strong>ProsperoStore yayında.</strong> Bu katalogdaki tüm uygulamalara doğrudan PS5'inizden göz atın, onları yükleyin ve güncelleyin. Şu an alfa sürümünde.",
      "notice.go": "GitHub'dan edinin",
      "foot.catalog": "Katalog", "foot.publish": "Uygulama yayınla", "foot.policy": "İnceleme politikası", "foot.report": "Uygulama bildir",
      "foot.feed": "JSON akışı", "foot.source": "Kaynak kodu",
      "foot.fine": "Yalnızca yerel PS5 homebrew uygulamalarını listeler. Topluluk tarafından yürütülür ve Sony Interactive Entertainment ile hiçbir bağlantısı yoktur. İndirmeler her geliştiricinin kendi GitHub sürümünden gelir; bu site dosyaları barındırmaz. Her geliştirici, uygulamasının lisansından ve içeriğinden tek başına sorumludur. Listelenen uygulamalar olduğu gibi, hiçbir garanti olmaksızın sunulur ve listelenmek bir güvenlik denetimi anlamına gelmez. <a href=\"{repo}#disclaimer\">Sorumluluk reddi</a> · Bakım: <a href=\"https://github.com/darkxex\">darkxex</a>, oluşturan: <a href=\"https://github.com/blackbearreloaded\">BlackBearReloaded</a> · Derleme: <a href=\"{repo}/commit/{commit}\">{short}</a>",
      "foot.updated": " · son güncelleme {time} UTC",
      "lang.label": "Dil",
      "translate.original": "Orijinali göster", "translate.translated": "Çeviriyi göster",
      "stage.details": "Ayrıntıları gör", "stage.new": "Yeni sürüm", "stage.featured": "Öne çıkan",
      "heading.home": "PS5 homebrew", "heading.results": "“{q}” için sonuçlar",
      "title.home": "PS5 Homebrew Store — topluluk uygulamaları, oyunları ve araçları", "title.suffix": "PS5 Homebrew Store", "title.search": "Arama",
      "sort.title": "Sıralamayı değiştir", "sort.by": "Sıralama: ", "order.name": "Ad", "order.updated": "Son güncellenen", "order.liked": "En beğenilen", "order.author": "Geliştirici",
      "empty.title": "Sonuç yok", "empty.text": "Başka bir uygulama ya da geliştirici adı deneyin.",
      "cats.label": "Kategoriler", "cats.all": "Tümü",
      "shelf.new": "Katalogda yeni", "shelf.updated": "Son güncellenenler", "shelf.changed": "Yeni ve güncellenenler", "shelf.liked": "En beğenilenler",
      "shelf.all": "Tümünü gör", "shelf.prev": "{title}: öncekiler", "shelf.next": "{title}: devamı",
      "n.likes": ["{n} beğeni", "{n} beğeni"], "n.comments": ["{n} yorum", "{n} yorum"], "n.apps": ["{n} uygulama", "{n} uygulama"],
      "stats.aria": "{likes}, {comments}",
      "copy": "Kopyala", "copied": "Kopyalandı",
      "comments.someone": "biri", "comments.readall": "Tüm yorumları GitHub'da okuyun ({n})",
      "app.back": "Tüm uygulamalar", "app.updated": "Güncellendi", "app.reserved": "Ayrıldı", "app.facts": "Sürüm bilgileri", "app.status": "Durum",
      "app.like": "Beğen", "app.comment": "Yorum yap", "app.shared": "Kimlik benzersiz değil",
      "app.sharednote": "<code>{titleid}</code> Title ID'siyle listelenmiş başka bir uygulama daha var: {links}. Bir konsol her Title ID için yalnızca bir uygulama tutar; bu yüzden bunu yüklemek diğerinin yerini alır ve ikisi aynı kayıt verilerini paylaşır.",
      "comments.title": "Yorumlar", "comments.none": "Henüz yorum yok. <a data-comments-link href=\"{href}\">İlk yorumu GitHub'da siz yazın</a>.",
      "comments.more": "GitHub'da yorum yap",
      "install.title": "Yükleme",
      "install.note": "Önce <a href=\"{release}\">sürüm notlarını</a> ve <a href=\"{repo}\">projenin belgelerini</a> okuyun. Bazı uygulamalar payload, yapılandırma ya da ek dosyalar gibi ek kurulum gerektirir; geliştiricinin talimatları aşağıdaki genel adımlardan önce gelir.",
      "step.zip.1": "<code>{file}</code> dosyasını indirin ve bilgisayarınızda arşivden çıkarın.",
      "step.zip.2": "Çıkardığınız <code>{titleid}/</code> klasörünü PS5'inizdeki <code>/data/homebrew/</code> klasörüne kopyalayın; örneğin FTP ile.",
      "step.zip.3": SHADOW + " gibi bir yükleyici klasörü algılar. {name} uygulamasını ana ekrandan başlatın.",
      "step.img.1": "<code>{file}</code> dosyasını indirin.",
      "step.img.2": "Dosyayı olduğu gibi PS5'inizdeki <code>/data/homebrew/</code> klasörüne kopyalayın; örneğin FTP ile.",
      "step.img.3": SHADOW + " imajı bağlar. {name} uygulamasını ana ekrandan başlatın.",
      "verify.title": "Doğrula", "verify.text": "Bu listeleme tek ve belirli bir dosyaya sabitlenmiştir. <code>sha256sum {file}</code> komutu şu çıktıyı vermelidir:",
      "verify.note": "Bu uygulamanın ve içeriğinin sorumluluğu geliştiricisine aittir: {author}. Homebrew, jailbreak yapılmış bir konsolda yükseltilmiş yetkilerle çalışır; yalnızca güvendiğiniz şeyleri yükleyin.",
      "source.title": "Kaynak", "source.release": "Sürüm {tag}",
      "details.title": "Ayrıntılar", "d.titleid": "Title ID", "d.category": "Kategori", "d.version": "Sürüm", "d.format": "Biçim", "d.license": "Lisans",
      "d.file": "Dosya", "d.updated": "Güncellendi", "d.status": "Durum", "d.reserved": "Ayrıldı", "d.source": "Kaynak", "d.likes": "Beğeniler", "d.comments": "Yorumlar",
      "panel.kicker": "Bu uygulamayı edinin", "panel.ready": "Hazır", "panel.note": "Doğrudan geliştiricinin GitHub sürümünden",
      "panel.download": "İndir", "panel.source": "Kaynak kodu",
      "panel.reason": "SHA-256 değeriyle tek ve belirli bir dosyaya sabitlenmiştir. Yüklemeden önce karşılaştırın.",
      "panel.get": "Bu uygulamayı edinin", "store.q": "PS5'inizde mi?", "store.text": "ProsperoStore ile koltuğunuzdan kalkmadan yükleyin ve güncelleyin.",
      "soon.title": "Henüz yayımlanmadı",
      "soon.text": "{author}, bu {kind} için <code>{titleid}</code> Title ID'sini ayırdı. İlk sürüm listelendiğinde indirme bağlantısı, kaynak kodu ve simgesi burada görünecek.",
      "soon.note": "Henüz hiçbir sürüm yayımlanmadı", "soon.later": "Yayımlandığında burada görünecek.",
      "notes.title": "Sürüm notları", "notes.source": "{author} tarafından {version} için yazıldı. ", "notes.full": "Notların tamamını GitHub'da okuyun", "notes.see": "Bu sürümü GitHub'da görün",
      "safety.title": "Güvenlik", "safety.aria": "Tarama sonuçları",
      "sb.stays": "Sandbox içinde kalıyor", "sb.stays.text": "Tarama, bu uygulamanın kendi dosyalarının dışına çıkmasını sağlayacak bir yol bulmadı: payload yok, payload yükleyicisine bağlantı yok, jailbreak hizmetine istek yok.",
      "sb.leaves": "Sandbox dışına çıkıyor", "sb.leaves.text": "Bu uygulama konsola tam erişim elde edebilir; bu genellikle kendi klasörünün dışındaki dosyaları okumak ve yazmak içindir. Yalnızca geliştiricisine güveniyorsanız yükleyin.",
      "sb.unclear": "Sandbox: belirsiz", "sb.unclear.text": "Tarama, bu uygulamanın payload yükleyicisine erişebileceğine dair zayıf işaretler buldu ancak kesin bir sonuca varamadı.",
      "helpers.unrev": ["{n} yardımcı program incelenmedi", "{n} yardımcı program incelenmedi"],
      "helpers.unrev.text": ["Sandbox dışında çalışan {n} yardımcı program içeriyor; bunların {u} tanesi katalog yöneticileri tarafından okunmadı.", "Sandbox dışında çalışan {n} yardımcı program içeriyor; bunların {u} tanesi katalog yöneticileri tarafından okunmadı."],
      "helpers.ok": "Yardımcı programlar incelendi",
      "helpers.ok.text": ["Sandbox dışında çalışan {n} yardımcı program içeriyor; bu program kataloğun incelenmiş yardımcı programlar listesinde yer alıyor.", "Sandbox dışında çalışan {n} yardımcı program içeriyor; hepsi kataloğun incelenmiş yardımcı programlar listesinde yer alıyor."],
      "build.attested": "GitHub Actions ile derlendi", "build.attested.text": "GitHub, uygulamanın deposundaki bir iş akışının (workflow) tam olarak bu dosyayı derlediğine dair imzalı bir beyan tutuyor.",
      "build.workflow": "Bir iş akışıyla yayımlandı", "build.workflow.text": "Uygulamanın deposundaki bir iş akışı (workflow) bu dosyayı sürüme ekledi. Nerede derlendiğini kanıtlayan bir şey yok.",
      "build.developer": "Geliştirici tarafından derlendi", "build.developer.text": "Geliştirici bu dosyayı elle derleyip yükledi. Dosyayı yayımlanan kaynak koduna bağlayan bir şey yok.",
      "safety.source": "Sürüm dosyasının otomatik taramasından elde edildi; dosya yalnızca okunur, asla çalıştırılmaz. Tarama bazı şeyleri gözden kaçırabilir: bir garanti değildir. " + SCAN + "Tarama nasıl çalışır?</a>",
      "lost.kicker": "Hata 404", "lost.title": "Bu rafta hiçbir şey yok", "lost.text": "Bu sayfa katalogda yok. Uygulamanın adı değişmiş ya da uygulama kaldırılmış olabilir.",
      "fmt.zip": "ZIP klasörü", "fmt.ffpkg": "FFPKG imajı", "fmt.ffpfsc": "FFPFSC imajı",
      "kind.app": "Uygulama", "kind.game": "Oyun", "kind.tool": "Araç",
      "kindlc.app": "uygulama", "kindlc.game": "oyun", "kindlc.tool": "araç",
      "unlicensed": "Lisanssız",
      "cat.console-ports": "Konsol oyunu portları", "cat.pc-ports": "PC oyunu portları", "cat.homebrew-games": "Homebrew oyunlar", "cat.emulators": "Emülatörler",
      "cat.streaming": "Oyun akışı", "cat.video": "Video ve TV", "cat.music": "Müzik ve ses", "cat.ai": "Yapay zekâ", "cat.utilities": "Yardımcı araçlar",
      "cat.tools": "Araçlar ve testler", "cat.showcases": "Demolar",
      "tv.title": "PS5 Homebrew — TV", "tv.sort": "Sıralama", "tv.exit": "TV modundan çık", "tv.cats": "Kategoriler", "tv.empty": "Burada henüz bir şey yok.",
      "tv.soonbadge": "Yakında", "tv.by": "{author} tarafından", "tv.of": "{i} / {total}",
      "tv.sortedby": "{count} · sıralama: {sort}",
      "tv.hint.move": "Gezin", "tv.hint.open": "Aç", "tv.hint.back": "Geri", "tv.hint.sort": "Sırala", "tv.hint.menu": "Menü",
      "tv.hint.changesort": "Sıralamayı değiştir", "tv.hint.exit": "Çık", "tv.hint.browse": "Göz at", "tv.hint.language": "Dili değiştir", "tv.hint.detail": "Önceki / sonraki · kaydır",
      "tv.credit": "Bakım: darkxex, oluşturan: BlackBearReloaded · Derleme: {short}",
      "tv.reserved": "Bu Title ID geliştiricisi tarafından ayrıldı. Uygulama henüz yayımlanmadı; yayımlandığında indirme bağlantısıyla birlikte burada görünecek.",
      "tv.scan": "İndirmek için kodu tarayın ya da bilgisayarınızda veya telefonunuzda açın:", "tv.hash": "{file} için SHA-256",
      "tv.releasenote": "Önce sürüm notlarını okuyun: bazı uygulamalar bir payload ya da ek kurulum gerektirir. Bu uygulamanın ve içeriğinin tek sorumlusu {author}.",
      "tv.comments": "Yorumlar ({n})",
      "tv.cm.like.scan": "Bu uygulamayı beğenmek ya da yorum yapmak için bu kodu telefonunuzla tarayın: uygulamanın GitHub'daki tartışması açılır; burada bir GitHub hesabı gerekir.",
      "tv.cm.like.open": "Bu uygulamayı beğenmek ya da yorum yapmak için telefonunuzda {url} adresini açın: uygulamanın GitHub'daki tartışması açılır; burada bir GitHub hesabı gerekir.",
      "tv.cm.first.scan": "Henüz yorum yok. İlk yorumu yazmak ya da bu uygulamayı beğenmek için bu kodu telefonunuzla tarayın: uygulamanın GitHub'daki tartışması açılır; burada bir GitHub hesabı gerekir.",
      "tv.cm.first.open": "Henüz yorum yok. İlk yorumu yazmak ya da bu uygulamayı beğenmek için telefonunuzda {url} adresini açın: uygulamanın GitHub'daki tartışması açılır; burada bir GitHub hesabı gerekir.",
      "tv.qr": "{address} için QR kodu",
      "tv.nojs": "TV modu için JavaScript gerekir. <a href=\"{base}\">Normal kataloğu açın</a>."
    },

    zh: {
      "brand.from": "PS5 目录",
      "skip": "跳到主要内容", "nav.sections": "版块",
      "tab.discover": "发现", "tab.apps": "应用", "tab.games": "游戏", "tab.tools": "工具", "tab.soon": "即将推出", "tab.all": "全部",
      "search.label": "搜索应用", "search.placeholder": "搜索",
      "link.tv": "电视模式", "link.submit": "提交应用",
      "notice.tag": "新",
      "notice.text": "<strong>ProsperoStore 来了。</strong>直接在 PS5 上浏览、安装和更新本目录中的所有应用。目前处于 alpha 阶段。",
      "notice.go": "前往 GitHub 获取",
      "foot.catalog": "目录", "foot.publish": "发布应用", "foot.policy": "审核政策", "foot.report": "举报应用",
      "foot.feed": "JSON 订阅源", "foot.source": "源代码",
      "foot.fine": "仅收录 PS5 原生自制应用。由社区运营，与 Sony Interactive Entertainment 无关联。下载文件来自各开发者自己的 GitHub 发布页，本站不予托管。各开发者对其应用的许可与内容全权负责。条目按原样提供，不作任何保证，上架也不代表通过安全审计。<a href=\"{repo}#disclaimer\">免责声明</a> · 由 <a href=\"https://github.com/darkxex\">darkxex</a> 维护，<a href=\"https://github.com/blackbearreloaded\">BlackBearReloaded</a> 创建 · 构建自 <a href=\"{repo}/commit/{commit}\">{short}</a>",
      "foot.updated": " · 最后更新于 {time} UTC",
      "lang.label": "语言",
      "translate.original": "显示原文", "translate.translated": "显示翻译",
      "stage.details": "查看详情", "stage.new": "新版本", "stage.featured": "精选",
      "heading.home": "PS5 自制软件", "heading.results": "“{q}” 的搜索结果",
      "title.home": "PS5 Homebrew Store — 社区应用、游戏与工具", "title.suffix": "PS5 Homebrew Store", "title.search": "搜索",
      "sort.title": "更改排序", "sort.by": "排序：", "order.name": "名称", "order.updated": "最近更新", "order.liked": "最受欢迎", "order.author": "开发者",
      "empty.title": "无匹配结果", "empty.text": "请尝试其他应用名或开发者。",
      "cats.label": "分类", "cats.all": "全部",
      "shelf.new": "最新收录", "shelf.updated": "最近更新", "shelf.changed": "新增与更新", "shelf.liked": "最受欢迎",
      "shelf.all": "查看全部", "shelf.prev": "{title} 的更早内容", "shelf.next": "{title} 的更多内容",
      "n.likes": ["{n} 个点赞", "{n} 个点赞"], "n.comments": ["{n} 条评论", "{n} 条评论"], "n.apps": ["{n} 个应用", "{n} 个应用"],
      "stats.aria": "{likes}，{comments}",
      "copy": "复制", "copied": "已复制",
      "comments.someone": "有人", "comments.readall": "在 GitHub 上阅读全部 {n} 条评论",
      "app.back": "全部应用", "app.updated": "已更新", "app.reserved": "已预留", "app.facts": "发布信息", "app.status": "状态",
      "app.like": "点赞", "app.comment": "评论", "app.shared": "Title ID 不唯一",
      "app.sharednote": "另有应用使用了 Title ID <code>{titleid}</code>：{links}。一台主机每个 Title ID 只能安装一个应用，因此安装本应用会替换另一个，且两者共享存档数据。",
      "comments.title": "评论", "comments.none": "暂无评论。<a data-comments-link href=\"{href}\">在 GitHub 上写下第一条</a>。",
      "comments.more": "在 GitHub 上评论",
      "install.title": "安装",
      "install.note": "请先阅读<a href=\"{release}\">发布说明</a>和<a href=\"{repo}\">项目文档</a>。某些应用需要额外设置，例如 payload、配置文件或其他附加文件；开发者的说明优先于以下通用步骤。",
      "step.zip.1": "下载 <code>{file}</code> 并在电脑上解压。",
      "step.zip.2": "将解压出的 <code>{titleid}/</code> 文件夹复制到 PS5 的 <code>/data/homebrew/</code>，例如通过 FTP。",
      "step.zip.3": SHADOW + " 会发现它。从主屏幕启动 {name}。",
      "step.img.1": "下载 <code>{file}</code>。",
      "step.img.2": "将该文件原样复制到 PS5 的 <code>/data/homebrew/</code>，例如通过 FTP。",
      "step.img.3": SHADOW + " 会挂载该镜像。从主屏幕启动 {name}。",
      "verify.title": "验证", "verify.text": "此条目固定对应一个确切的文件。<code>sha256sum {file}</code> 必须输出：",
      "verify.note": "本应用及其内容由其开发者 {author} 负责。自制应用在已越狱的主机上以更高权限运行，请仅安装你信任的内容。",
      "source.title": "来源", "source.release": "版本 {tag}",
      "details.title": "详情", "d.titleid": "Title ID", "d.category": "分类", "d.version": "版本", "d.format": "格式", "d.license": "许可证",
      "d.file": "文件", "d.updated": "更新时间", "d.status": "状态", "d.reserved": "预留时间", "d.source": "来源", "d.likes": "点赞数", "d.comments": "评论数",
      "panel.kicker": "获取此应用", "panel.ready": "就绪", "panel.note": "直接来自开发者的 GitHub 发布页",
      "panel.download": "下载", "panel.source": "源代码",
      "panel.reason": "已通过 SHA-256 固定为一个确切的文件。安装前请先核对。",
      "panel.get": "获取此应用", "store.q": "在你的 PS5 上？", "store.text": "用 ProsperoStore 坐在沙发上即可安装和更新。",
      "soon.title": "尚未发布",
      "soon.text": "{author} 已为该{kind}预留 Title ID <code>{titleid}</code>。首个版本发布后，其下载、源代码和图标将显示在此处。",
      "soon.note": "尚未发布任何版本", "soon.later": "发布后将显示在此处。",
      "notes.title": "发布说明", "notes.source": "{author} 为 {version} 撰写。", "notes.full": "在 GitHub 上阅读完整说明", "notes.see": "在 GitHub 上查看此版本",
      "safety.title": "安全性", "safety.aria": "扫描结果",
      "sb.stays": "留在沙盒", "sb.stays.text": "扫描未发现此应用访问自身文件之外内容的途径：无 payload、未连接 payload 加载器、也未请求越狱服务。",
      "sb.leaves": "脱离沙盒", "sb.leaves.text": "此应用可以获得主机的完全访问权限，通常用于读写其自身文件夹之外的文件。请仅在信任其开发者的情况下安装。",
      "sb.unclear": "沙盒：无法确定", "sb.unclear.text": "扫描发现此应用可能连接到 payload 加载器的微弱迹象，但无法确定。",
      "helpers.unrev": ["{n} 个辅助程序未审核", "{n} 个辅助程序未审核"],
      "helpers.unrev.text": ["它包含 {n} 个在沙盒外运行的辅助程序，其中 {u} 个尚未经目录维护者审核。", "它包含 {n} 个在沙盒外运行的辅助程序，其中 {u} 个尚未经目录维护者审核。"],
      "helpers.ok": "辅助程序已审核",
      "helpers.ok.text": ["它包含 {n} 个在沙盒外运行的辅助程序，均在目录的已审核列表中。", "它包含 {n} 个在沙盒外运行的辅助程序，均在目录的已审核列表中。"],
      "build.attested": "由 GitHub Actions 构建", "build.attested.text": "GitHub 保存着一份签名声明，证明此应用仓库中的某个工作流构建的正是此文件。",
      "build.workflow": "由工作流发布", "build.workflow.text": "该应用仓库的工作流将此文件添加到了发布中，但无法证明它是在哪里构建的。",
      "build.developer": "由开发者构建", "build.developer.text": "由其开发者构建并上传。没有任何东西能证明此文件与公开的源代码相关。",
      "safety.source": "来自对发布文件的自动扫描：文件只被读取，从不运行。扫描可能会有所遗漏，不构成保证。" + SCAN + "扫描如何工作</a>",
      "lost.kicker": "错误 404", "lost.title": "此货架暂时没有内容", "lost.text": "此页面不在目录中。该应用可能已被改名或下架。",
      "fmt.zip": "ZIP 文件夹", "fmt.ffpkg": "FFPKG 镜像", "fmt.ffpfsc": "FFPFSC 镜像",
      "kind.app": "应用", "kind.game": "游戏", "kind.tool": "工具",
      "kindlc.app": "应用", "kindlc.game": "游戏", "kindlc.tool": "工具",
      "unlicensed": "无许可证",
      "cat.console-ports": "主机游戏移植", "cat.pc-ports": "PC 游戏移植", "cat.homebrew-games": "自制游戏", "cat.emulators": "模拟器",
      "cat.streaming": "游戏串流", "cat.video": "视频与电视", "cat.music": "音乐与音频", "cat.ai": "AI", "cat.utilities": "实用工具",
      "cat.tools": "工具与测试", "cat.showcases": "展示",
      "tv.title": "PS5 Homebrew — 电视模式", "tv.sort": "排序", "tv.exit": "退出电视模式", "tv.cats": "分类", "tv.empty": "这里还没有内容。",
      "tv.soonbadge": "即将", "tv.by": "开发者：{author}", "tv.of": "{i} / {total}",
      "tv.sortedby": "{count} · 排序：{sort}",
      "tv.hint.move": "移动", "tv.hint.open": "打开", "tv.hint.back": "返回", "tv.hint.sort": "排序", "tv.hint.menu": "菜单",
      "tv.hint.changesort": "更改排序", "tv.hint.exit": "退出", "tv.hint.browse": "浏览", "tv.hint.language": "切换语言", "tv.hint.detail": "上一个 / 下一个 · 滚动",
      "tv.credit": "由 darkxex 维护，BlackBearReloaded 创建 · 构建自 {short}",
      "tv.reserved": "此 Title ID 已由其开发者预留。应用尚未发布，发布后将随下载链接一起显示在此处。",
      "tv.scan": "扫描，或在电脑或手机上打开，即可下载：", "tv.hash": "{file} 的 SHA-256",
      "tv.releasenote": "请先阅读发布说明：某些应用需要 payload 或额外设置。本应用及其内容由 {author} 全权负责。",
      "tv.comments": "评论（{n}）",
      "tv.cm.like.scan": "要为该应用点赞或评论，请用手机扫描此二维码：它会打开该应用在 GitHub 上的讨论（需要 GitHub 账户）。",
      "tv.cm.like.open": "要为该应用点赞或评论，请在手机上打开 {url}：它会打开该应用在 GitHub 上的讨论（需要 GitHub 账户）。",
      "tv.cm.first.scan": "暂无评论。要写下第一条评论或为该应用点赞，请用手机扫描此二维码：它会打开该应用在 GitHub 上的讨论（需要 GitHub 账户）。",
      "tv.cm.first.open": "暂无评论。要写下第一条评论或为该应用点赞，请在手机上打开 {url}：它会打开该应用在 GitHub 上的讨论（需要 GitHub 账户）。",
      "tv.qr": "{address} 的二维码",
      "tv.nojs": "电视模式需要 JavaScript。<a href=\"{base}\">打开普通目录</a>。"
    }
  };

  /* ---- Which language ---- */

  function stored(value) { // read, or write when value is given; storage may be blocked
    try {
      if (value === undefined) return window.localStorage.getItem(KEY);
      window.localStorage.setItem(KEY, value);
    } catch (error) { /* private mode or disabled storage */ }
    return null;
  }
  function known(code) { return LANGS.some(function (one) { return one[0] === code; }) ? code : ""; }

  /* The first of the browser's preferred languages (fr-CA, en, ...) that the page has. */
  function browserLanguage() {
    var wanted = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || "en"];
    for (var i = 0; i < wanted.length; i++) {
      var code = known(String(wanted[i]).slice(0, 2).toLowerCase());
      if (code) return code;
    }
    return "";
  }

  var lang = "en";
  try {
    var asked = known(new URLSearchParams(window.location.search).get("lang") || "");
    if (asked) stored(asked);
    lang = asked || known(stored() || "") || browserLanguage() || "en";
    if (asked) { // the address keeps nothing of it
      var params = new URLSearchParams(window.location.search);
      params.delete("lang");
      var rest = params.toString();
      window.history.replaceState(window.history.state, "", window.location.pathname + (rest ? "?" + rest : "") + window.location.hash);
    }
  } catch (error) { /* no URL API: English or the stored choice */ }
  document.documentElement.lang = lang;

  /* ---- Words ---- */

  function escape(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function pick(entry, count) {
    if (!Array.isArray(entry)) return entry;
    var one = count === 1 || (lang === "fr" && count === 0);
    return one ? entry[0] : entry[1];
  }
  function lookup(key, count) {
    var mine = WORDS[lang] && WORDS[lang][key];
    if (mine === undefined) mine = WORDS.en[key];
    return mine === undefined ? key : pick(mine, count);
  }
  function fill(text, vars, markup) {
    return text.replace(/\{(\w+)\}/g, function (whole, name) {
      if (!vars || vars[name] === undefined || vars[name] === null) return whole;
      var value = String(vars[name]);
      if (value.charAt(0) === "@") value = lookup(value.slice(1));
      return markup && name !== "links" && name !== "href" ? escape(value) : value;
    });
  }
  /* The words for `key`; `vars.n` picks the singular or the plural. */
  function t(key, vars) { return fill(lookup(key, vars && vars.n), vars, false); }
  /* The same as markup: the values go in escaped (`links` is markup built by the page). */
  function html(key, vars) { return fill(lookup(key, vars && vars.n), vars, true); }
  /* The same as plain text, with the markup of the sentence taken out. */
  function text(key, vars) {
    var holder = document.createElement("div");
    holder.innerHTML = html(key, vars);
    return holder.textContent;
  }
  function category(key, fallback) { var word = lookup("cat." + key); return word === "cat." + key ? fallback : word; }
  function kind(key, fallback) { var word = lookup("kind." + key); return word === "kind." + key ? fallback : word; }

  function date(iso, withTime) {
    var when = new Date(iso);
    if (isNaN(when)) return "";
    var options = withTime ? { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" } : { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" };
    try { return when.toLocaleString(lang, options); } catch (error) { return when.toISOString().slice(0, 10); }
  }

  /* ---- The page's own words ---- */

  function varsOf(node) {
    var vars = {};
    Object.keys(node.dataset).forEach(function (name) {
      if (/^v[A-Z]/.test(name)) vars[name.charAt(1).toLowerCase() + name.slice(2)] = node.dataset[name];
    });
    if (vars.time) vars.time = date(vars.time, true);
    if (vars.n !== undefined) vars.n = Number(vars.n);
    return vars;
  }
  function setText(node, words) {
    for (var child = node.firstChild; child; child = child.nextSibling) {
      if (child.nodeType === 3 && child.nodeValue.trim()) { child.nodeValue = words; return; }
    }
    if (!node.firstElementChild) node.textContent = words; else node.appendChild(document.createTextNode(words));
  }
  function apply(scope) {
    scope = scope || document;
    Array.prototype.forEach.call(scope.querySelectorAll("[data-i18n]"), function (node) {
      setText(node, t(node.getAttribute("data-i18n"), varsOf(node)));
    });
    Array.prototype.forEach.call(scope.querySelectorAll("[data-i18n-html]"), function (node) {
      node.innerHTML = html(node.getAttribute("data-i18n-html"), varsOf(node));
    });
    Array.prototype.forEach.call(scope.querySelectorAll("[data-i18n-attr]"), function (node) {
      node.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var parts = pair.split(":");
        if (parts.length === 2) node.setAttribute(parts[0], t(parts[1], varsOf(node)));
      });
    });
    Array.prototype.forEach.call(scope.querySelectorAll("[data-license]"), function (node) {
      if (node.textContent === WORDS.en.unlicensed) node.textContent = t("unlicensed"); // the one word the catalog itself writes
    });
    Array.prototype.forEach.call(scope.querySelectorAll("time[datetime]"), function (node) {
      var shown = node.hasAttribute("data-keep") ? "" : date(node.getAttribute("datetime"), false);
      if (shown) node.textContent = shown;
    });
  }

  /* ---- The flags ---- */

  function choose(code) {
    stored(code);
    window.location.reload();
  }
  function current() { return LANGS.filter(function (one) { return one[0] === lang; })[0]; }
  /* TV mode steps through the languages with one button. */
  function next() { return LANGS[(LANGS.indexOf(current()) + 1) % LANGS.length]; }

  function picker() {
    var bar = document.querySelector(".bar__end");
    if (!bar) return;
    var box = document.createElement("div");
    box.className = "lang";
    var button = document.createElement("button");
    button.type = "button";
    button.className = "lang__button";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-label", t("lang.label") + ": " + current()[2]);
    button.title = t("lang.label");
    // The flags are in the list; the button names the language in use, the browser's or the reader's choice.
    var code = document.createElement("span");
    code.className = "lang__code";
    code.textContent = lang.toUpperCase();
    button.appendChild(code);
    var menu = document.createElement("ul");
    menu.className = "lang__menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;
    LANGS.forEach(function (one) {
      var entry = document.createElement("li");
      var choice = document.createElement("button");
      choice.type = "button";
      choice.setAttribute("role", "option");
      choice.setAttribute("lang", one[0]);
      choice.setAttribute("aria-selected", String(one[0] === lang));
      var mark = document.createElement("span");
      mark.className = "lang__flag";
      mark.textContent = one[1];
      choice.appendChild(mark);
      choice.appendChild(document.createTextNode(one[2]));
      choice.addEventListener("click", function () { if (one[0] === lang) close(); else choose(one[0]); });
      entry.appendChild(choice);
      menu.appendChild(entry);
    });
    function close() { menu.hidden = true; button.setAttribute("aria-expanded", "false"); }
    button.addEventListener("click", function () {
      menu.hidden = !menu.hidden;
      button.setAttribute("aria-expanded", String(!menu.hidden));
    });
    document.addEventListener("click", function (event) { if (!box.contains(event.target)) close(); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !menu.hidden) { close(); button.focus(); } });
    box.appendChild(button);
    box.appendChild(menu);
    bar.appendChild(box); // after "Submit app"
  }

  /* ---- Developers' words ----
     Descriptions and release notes are written by the developers, in whatever language they use. When it
     is not the reader's (English included), the text is machine-translated by Google Translate in the
     reader's browser, and kept in this browser (a changed text is simply translated again). A text that
     is already in the reader's language is left as it is, with no button. If it fails, the text stays. */
  var TRANSLATE = "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl=auto&tl=";
  var SAME = "=same";   // remembered for a text that is already in the reader's language
  function remembered(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (error) { /* no storage: translated again next time */ }
    return null;
  }
  function translate(source, done) {
    var original = String(source || "").trim();
    if (!original || original.length > 1500 || !window.fetch) return;
    var key = "catalog-tr:" + lang + ":" + original;
    var known = remembered(key);
    if (known === SAME) return;
    if (known) { done(known); return; }
    window.fetch(TRANSLATE + lang + "&q=" + encodeURIComponent(original), { credentials: "omit", referrerPolicy: "no-referrer" })
      .then(function (answer) { return answer.json(); })
      .then(function (data) {
        var out = (data[0] || []).map(function (part) { return part[0] || ""; }).join("").trim();
        if (!out) return;
        var from = String(data[2] || "").split("-")[0];
        if (from === lang || out === original) { remembered(key, SAME); return; }
        remembered(key, out);
        done(out);
      })
      .catch(function () { /* the English stays */ });
  }
  /* Every text of the markup under `root` (code and preformatted text stay as written). */
  function translateWithin(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [], node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue.trim().length > 1 && !(node.parentNode.closest && node.parentNode.closest("code, pre"))) nodes.push(node);
    }
    var done = [], button = null, showing = true;
    /* "Show original" appears once something is translated, and switches back and forth. */
    function toggle() {
      showing = !showing;
      done.forEach(function (one) { if (one.node.parentNode) one.node.nodeValue = showing ? one.translated : one.original; });
      button.textContent = t(showing ? "translate.original" : "translate.translated");
    }
    nodes.slice(0, 80).forEach(function (one) {
      var original = one.nodeValue, lead = original.match(/^\s*/)[0], tail = original.match(/\s*$/)[0];
      translate(original, function (text) {
        if (!one.parentNode) return;
        var translated = lead + text + tail;
        one.nodeValue = showing ? translated : original;
        done.push({ node: one, original: original, translated: translated });
        if (button || !root.parentNode) return;
        button = document.createElement("button");
        button.type = "button";
        button.className = "translated__toggle";
        button.textContent = t("translate.original");
        button.addEventListener("click", toggle);
        /* data-translate-by="id": the button sits beside that heading instead of under the text;
           data-translate-inline: at the end of the text itself. */
        var by = root.getAttribute("data-translate-by");
        by = by && document.getElementById(by);
        if (root.hasAttribute("data-translate-inline")) root.appendChild(button);
        else if (by) by.appendChild(button);
        else root.parentNode.insertBefore(button, root.nextSibling);
      });
    });
  }
  document.addEventListener("DOMContentLoaded", function () {
    var marked = document.querySelectorAll("[data-translate]");
    for (var i = 0; i < marked.length; i++) translateWithin(marked[i]);
  });

  window.I18N = { translate: translate, lang: lang, langs: LANGS, t: t, html: html, text: text, category: category, kind: kind, date: date, apply: apply, next: next, choose: choose };

  document.addEventListener("DOMContentLoaded", function () {
    apply();
    picker();
  });
})();
