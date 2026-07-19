FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY support.js image-slot.js /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY ["Kinomad Landing.dc.html", "/usr/share/nginx/html/Kinomad Landing.dc.html"]
COPY ["Kinomad Works.dc.html", "/usr/share/nginx/html/Kinomad Works.dc.html"]
COPY ["Kinomad Website Page.dc.html", "/usr/share/nginx/html/Kinomad Website Page.dc.html"]
COPY ["Kinomad Brand Page.dc.html", "/usr/share/nginx/html/Kinomad Brand Page.dc.html"]
COPY ["Kinomad Motion Page.dc.html", "/usr/share/nginx/html/Kinomad Motion Page.dc.html"]
COPY ["Kinomad CRM.dc.html", "/usr/share/nginx/html/Kinomad CRM.dc.html"]
COPY ["Kinomad 404.dc.html", "/usr/share/nginx/html/Kinomad 404.dc.html"]

RUN cp "/usr/share/nginx/html/Kinomad Landing.dc.html" /usr/share/nginx/html/index.html \
    && cp "/usr/share/nginx/html/Kinomad 404.dc.html" /usr/share/nginx/html/404.html

EXPOSE 80
