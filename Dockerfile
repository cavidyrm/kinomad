FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Glob copies, not a per-file whitelist. A whitelist is how a file lands in the repo
# but never in the image — the page then requests it, gets whatever the catch-all
# returns, and fails at runtime instead of at build time.
COPY *.html /usr/share/nginx/html/
COPY *.css  /usr/share/nginx/html/
COPY *.js   /usr/share/nginx/html/
COPY *.txt  /usr/share/nginx/html/
COPY *.xml  /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/

# Fail the build rather than the site if a required file is missing.
RUN set -e; cd /usr/share/nginx/html; \
    for f in "index.html" "404.html" "industry.css" "image-slot.js" \
             "robots.txt" "sitemap.xml" \
             "assets/hero.png" "assets/coach1.png" "assets/prog-strength.png"; do \
      [ -f "$f" ] || { echo "MISSING FROM IMAGE: $f"; exit 1; }; \
    done

EXPOSE 80
