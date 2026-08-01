FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Glob copies, not a per-file whitelist. The whitelist is what broke the last deploy:
# km-api.js and the sign-in page were added to the repo but never added to this file,
# so the image shipped without them and the booking modal threw "KMAPI is not defined".
# Anything new that lands next to the pages now ships automatically.
COPY *.js /usr/share/nginx/html/
COPY *.html /usr/share/nginx/html/
COPY *.dc.html /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/

# Landing is the index; the 404 page is what nginx serves on a miss.
RUN cp "/usr/share/nginx/html/Kinomad Landing.dc.html" /usr/share/nginx/html/index.html \
    && cp "/usr/share/nginx/html/Kinomad 404.dc.html" /usr/share/nginx/html/404.html

# Fail the build rather than the site if a required file is missing.
RUN set -e; cd /usr/share/nginx/html; \
    for f in "km-api.js" "km-routes.js" "support.js" "image-slot.js" "reels.html" \
             "Kinomad Landing.dc.html" "Kinomad Works.dc.html" "Kinomad Privacy.dc.html" \
             "Kinomad Website Page.dc.html" "Kinomad Brand Page.dc.html" "Kinomad Motion Page.dc.html" \
             "Kinomad CRM.dc.html" "Kinomad CRM Sign In.dc.html" "Kinomad 404.dc.html" \
             "assets/favicon.svg" "assets/logo-light.svg"; do \
      [ -f "$f" ] || { echo "MISSING FROM IMAGE: $f"; exit 1; }; \
    done

EXPOSE 80
