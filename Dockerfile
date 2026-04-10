FROM node:22-alpine as build-step
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .

RUN npm run build --configuration=production

FROM nginx:alpine

COPY --from=build-step /app/dist/krdata-portal/browser /usr/share/nginx/html

RUN printf "server { \n\
    listen 8080; \n\
    location / { \n\
    root /usr/share/nginx/html; \n\
    index index.html index.htm; \n\
    try_files \$uri \$uri/ /index.html; \n\
    } \n\
    }" > /etc/nginx/conf.d/default.conf

EXPOSE 8080

# Environment variables for Cloud Run
ENV IT-KRDATA-API_BASE_URL=""
ENV IT-KINFRA-CLIENT_ID=""
ENV IT-KINFRA-AUTHORITY=""
ENV IT-KRDATA-APP_NAME=""
ENV IT-KRDATA-APP_VERSION=""
ENV IT-KRDATA-ENV=""
ENV IT-KRDATA-DOMAIN_PE=""
ENV IT-KRDATA-DOMAIN_DEV=""
ENV IT-KRDATA-DOMAIN_MX=""
ENV IT-KRDATA-DOMAIN_CL=""

# Runtime replacement of placeholders in JS files
CMD ["/bin/sh", "-c", "\
    echo 'Injecting Environment Variables...'; \
    for file in /usr/share/nginx/html/*.js; do \
      [ -n \"$(printenv IT-KRDATA-API_BASE_URL)\" ] && sed -i \"s|IT-KRDATA-API_BASE_URL_PLACEHOLDER|$(printenv IT-KRDATA-API_BASE_URL)|g\" \"$file\"; \
      [ -n \"$(printenv IT-KINFRA-CLIENT_ID)\" ] && sed -i \"s|IT-KINFRA-CLIENT_ID_PLACEHOLDER|$(printenv IT-KINFRA-CLIENT_ID)|g\" \"$file\"; \
      [ -n \"$(printenv IT-KINFRA-AUTHORITY)\" ] && sed -i \"s|IT-KINFRA-AUTHORITY_PLACEHOLDER|$(printenv IT-KINFRA-AUTHORITY)|g\" \"$file\"; \
      [ -n \"$(printenv IT-KRDATA-APP_NAME)\" ] && sed -i \"s|IT-KRDATA-APP_NAME_PLACEHOLDER|$(printenv IT-KRDATA-APP_NAME)|g\" \"$file\"; \
      [ -n \"$(printenv IT-KRDATA-APP_VERSION)\" ] && sed -i \"s|IT-KRDATA-APP_VERSION_PLACEHOLDER|$(printenv IT-KRDATA-APP_VERSION)|g\" \"$file\"; \
      [ -n \"$(printenv IT-KRDATA-ENV)\" ] && sed -i \"s|IT-KRDATA-ENV_PLACEHOLDER|$(printenv IT-KRDATA-ENV)|g\" \"$file\"; \
      [ -n \"$(printenv IT-KRDATA-DOMAIN_PE)\" ] && sed -i \"s|IT-KRDATA-DOMAIN_PE_PLACEHOLDER|$(printenv IT-KRDATA-DOMAIN_PE)|g\" \"$file\"; \
      [ -n \"$(printenv IT-KRDATA-DOMAIN_DEV)\" ] && sed -i \"s|IT-KRDATA-DOMAIN_DEV_PLACEHOLDER|$(printenv IT-KRDATA-DOMAIN_DEV)|g\" \"$file\"; \
      [ -n \"$(printenv IT-KRDATA-DOMAIN_MX)\" ] && sed -i \"s|IT-KRDATA-DOMAIN_MX_PLACEHOLDER|$(printenv IT-KRDATA-DOMAIN_MX)|g\" \"$file\"; \
      [ -n \"$(printenv IT-KRDATA-DOMAIN_CL)\" ] && sed -i \"s|IT-KRDATA-DOMAIN_CL_PLACEHOLDER|$(printenv IT-KRDATA-DOMAIN_CL)|g\" \"$file\"; \
    done; \
    echo 'Done. Starting Nginx...'; \
    nginx -g 'daemon off;' \
"]