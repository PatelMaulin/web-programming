-- Run this only if you do not already have the class's paws.student table.
CREATE DATABASE IF NOT EXISTS paws;
USE paws;
CREATE TABLE IF NOT EXISTS student (
  user_id VARCHAR(100) PRIMARY KEY,
  fname VARCHAR(100) NOT NULL,
  lname VARCHAR(100) NOT NULL,
  gpa DECIMAL(3,2) NOT NULL,
  password VARCHAR(128) NOT NULL,
  salt VARCHAR(100) NOT NULL
);
