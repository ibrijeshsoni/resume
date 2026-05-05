FROM docker.io/library/nginx:alpine

# Copy static files to Nginx html directory
COPY . /usr/share/nginx/html

# Ensure Nginx can read the files
RUN chmod -R 755 /usr/share/nginx/html

# Copy SSL certificates
COPY certs /etc/nginx/certs

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose ports
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
