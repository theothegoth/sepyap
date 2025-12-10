-- Fix database encoding for Turkish characters
-- Run these commands in psql (you're already there!)

-- Step 1: Drop the existing database
DROP DATABASE grocery_matcher;

-- Step 2: Create new database with UTF-8 encoding
CREATE DATABASE grocery_matcher 
  WITH ENCODING 'UTF8' 
  LC_COLLATE='en_US.UTF-8' 
  LC_CTYPE='en_US.UTF-8'
  TEMPLATE template0;

-- Step 3: Verify encoding
\c grocery_matcher
SHOW client_encoding;

-- You should see: UTF8

