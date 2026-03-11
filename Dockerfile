FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      ruby ruby-dev build-essential git && \
    gem install bundler && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /site

COPY Gemfile ./
RUN bundle install

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
