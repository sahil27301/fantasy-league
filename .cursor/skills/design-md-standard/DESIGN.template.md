---
version: alpha
name: Your Design System Name
description: Short statement of brand and product interface intent.
colors:
  primary: "#1A1C1E"
  secondary: "#6C7278"
  tertiary: "#B8422E"
  neutral: "#F7F5F2"
typography:
  h1:
    fontFamily: "Inter"
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  body-md:
    fontFamily: "Inter"
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: 4px
  md: 8px
spacing:
  sm: 8px
  md: 16px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.neutral}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px
---

## Overview

Describe the visual voice and intended emotional tone for product and brand surfaces.

## Colors

Define what each color token means and where each should be used.

## Typography

Define heading/body roles, rhythm, and readability constraints.

## Layout

Document spacing, density, and grid behavior.

## Elevation & Depth

Document shadows, borders, and layering behavior.

## Shapes

Document radius and geometric language.

## Components

Document mapping between component roles and token references.

## Do's and Don'ts

Document anti-patterns to avoid and non-negotiable quality rules.
