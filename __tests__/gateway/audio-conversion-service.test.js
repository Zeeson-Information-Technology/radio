/**
 * Gateway Audio Conversion Service Tests
 * Tests the EC2 gateway conversion service functionality
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Mock dependencies
jest.mock('aws-sdk');
jest.mock('fluent-ffmpeg');
jest.mock('mongoose');
jest.mock('uuid');

const AWS = require('aws-sdk');
const ffmpeg = require('fluent-ffmpeg');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('