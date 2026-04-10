FROM node:22-alpine as build-step
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .

RUN npm run build --configuration=production

FROM nginx:alpine

COPY --from=build-step /app/dist/kbatch-portal/browser /usr/share/nginx/html

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
ENV IT-KOBS-API_BASE_URL=""
ENV IT-KINFRA-CLIENT_ID=""
ENV IT-KINFRA-AUTHORITY=""
ENV IT-KBATCH-ARGO_FILTER=""
ENV IT-KBATCH-COMPASS_FILTER=""
ENV IT-KBATCH-APP_NAME=""
ENV IT-KBATCH-API_HEALTH=""
ENV IT-KBATCH-APP_VERSION=""
ENV IT-KBATCH-ENV=""
ENV IT-KBATCH-DOMAIN_PE=""
ENV IT-KBATCH-DOMAIN_DEV=""
ENV IT-KBATCH-DOMAIN_MX=""
ENV IT-KBATCH-DOMAIN_CL=""

# Runtime replacement of placeholders in JS files
CMD ["/bin/sh", "-c", "\
    echo 'Injecting Environment Variables...'; \
    for file in /usr/share/nginx/html/*.js; do \
      sed -i \"s|IT-KOBS-API_BASE_URL_PLACEHOLDER|$(printenv IT-KOBS-API_BASE_URL)|g\" \"$file\"; \
      sed -i \"s|IT-KINFRA-CLIENT_ID_PLACEHOLDER|$(printenv IT-KINFRA-CLIENT_ID)|g\" \"$file\"; \
      sed -i \"s|IT-KINFRA-AUTHORITY_PLACEHOLDER|$(printenv IT-KINFRA-AUTHORITY)|g\" \"$file\"; \
      sed -i \"s|IT-KBATCH-ARGO_FILTER_PLACEHOLDER|$(printenv IT-KBATCH-ARGO_FILTER)|g\" \"$file\"; \
      sed -i \"s|IT-KBATCH-COMPASS_FILTER_PLACEHOLDER|$(printenv IT-KBATCH-COMPASS_FILTER)|g\" \"$file\"; \
      sed -i \"s|IT-KBATCH-APP_NAME_PLACEHOLDER|$(printenv IT-KBATCH-APP_NAME)|g\" \"$file\"; \
      sed -i \"s|IT-KBATCH-API_HEALTH_PLACEHOLDER|$(printenv IT-KBATCH-API_HEALTH)|g\" \"$file\"; \
      sed -i \"s|IT-KBATCH-APP_VERSION_PLACEHOLDER|$(printenv IT-KBATCH-APP_VERSION)|g\" \"$file\"; \
      sed -i \"s|IT-KBATCH-ENV_PLACEHOLDER|$(printenv IT-KBATCH-ENV)|g\" \"$file\"; \
      sed -i \"s|IT-KBATCH-DOMAIN_PE_PLACEHOLDER|$(printenv IT-KBATCH-DOMAIN_PE)|g\" \"$file\"; \
      sed -i \"s|IT-KBATCH-DOMAIN_DEV_PLACEHOLDER|$(printenv IT-KBATCH-DOMAIN_DEV)|g\" \"$file\"; \
      sed -i \"s|IT-KBATCH-DOMAIN_MX_PLACEHOLDER|$(printenv IT-KBATCH-DOMAIN_MX)|g\" \"$file\"; \
      sed -i \"s|IT-KBATCH-DOMAIN_CL_PLACEHOLDER|$(printenv IT-KBATCH-DOMAIN_CL)|g\" \"$file\"; \
    done; \
    echo 'Done. Starting Nginx...'; \
    nginx -g 'daemon off;' \
"]