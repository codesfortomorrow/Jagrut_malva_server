<!-- <p align="center">
  <a href="#" target="_blank"><img src="#" width="200" alt="logo" /></a>
</p> -->

<p align="center">
  <a href="#" target="_blank">NestJS App</a> built using Nest framework with Typescript & Postgres database.
</p>

## Description

To be specified.

## Installation

Skip this section for docker based production deployment

```bash
# install dependencies
$ npm install

```

## Setup

Copy the contents of example.env to create .env in the root and update env variables to set server configuration to run.

First you need to run and initialize databases.

### For non docker environment

`DATABASE_URL`, `REDIS_URI` in .env will be use to connect with databases, Please make sure you have correct connection uri here.

```bash
# This command will create db & deploy migrations on target database
$ npm run db:migrate:deploy
```

### For docker environment

Notes: If you already have running required database containers then you can follow same setup as mentioned above for non docker environment.

`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`, `REDIS_PORT`, `REDIS_PASSWORD` will be use to create database containers with authentication credential from .env, So make sure `DATABASE_URL` and `REDIS_URI` have exact same user, password and port for connection.

To run production database containers you need to set `POSTGRES_DATA_VOLUME` and `REDIS_DATA_VOLUME` value to be set in .env file to mount the volume into host machine.

```bash
# run the database containers for development (Ignore this for production)
$ npm run dev:db

# run the database containers for production (Ignore for development)
$ npm run prod:db

# initialize database
$ npm run db:migrate:deploy
```

For convenience to switch between docker environment to local environment & testing, Please create host entry in your machine with following-

```
127.0.0.1 postgres
127.0.0.1 redis
```

## Running the server on docker environment

```bash
# watch mode (development)
$ npm run dev
$ npm run dev:stop # To shut down containers

# build & run without watch mode (production)
$ npm run prod
$ npm run prod:stop # To shut down containers
```

## Running the server without docker

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Migrate/Sync Database Schema

```bash
# preview schema
$ npm run db:studio

# Seed database
$ npm run db:seed

# Generate client with schema
$ npm run db:client:generate

# Push schema changes to the database without migration
$ npm run db:schema:push

# generate migration for new changes
$ npm run db:migration:create

# generate migration for new changes & deploy
$ npm run db:migrate:dev

# reset database
$ npm run db:migrate:reset

# deploy all migrations
$ npm run db:migrate:deploy
```
