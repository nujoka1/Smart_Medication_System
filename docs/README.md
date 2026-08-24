# MedSystem Documentation

This directory contains the product, engineering, and user documentation for the MedSystem Smart Medication Dispenser.

## Product and Engineering Documents

- [Design and Architecture](DESIGN_AND_ARCHITECTURE.md) — system architecture, physical concept, dispensing logic, verification, time architecture, and product-design principles.
- [User Guide](USER_GUIDE.md) — user-facing operating guide for the dashboard and medication workflow.
- [V2 Frontend Notes](../v2/README.md) — responsive dashboard and Android frontend notes.

## Visual Documentation

### System Architecture

![MedSystem system architecture](images/system-architecture.svg)

### Conceptual 2D Product Design

![MedSystem conceptual 2D design](images/medsystem-2d-concept.svg)

### Continuous Pill-Count Dispensing Flow

![MedSystem dispensing sequence](images/dispensing-flow.svg)

## Drawing Status

The SVG drawings are clean documentation illustrations intended for GitHub, reports, presentations, and engineering discussion. The 2D enclosure view is a **concept layout**, not a dimensioned manufacturing drawing. Final production drawings should be generated from measured hardware and mechanical CAD after the enclosure, cartridge geometry, TFT, camera, motors, service clearances, fasteners, and power hardware are frozen.

## Recommended Future Documentation Assets

As the physical build is finalized, this directory should also contain:

- dimensioned enclosure drawing (PDF/SVG);
- exploded mechanical view;
- wiring schematic;
- PCB/connection diagram;
- final assembled-device photographs;
- TFT screenshots;
- dashboard and Android screenshots;
- medication cartridge detail;
- test and validation results;
- BOM and assembly instructions.
