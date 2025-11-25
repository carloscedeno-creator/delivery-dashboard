export const projectData = [
    {
        squad: "Core Infrastructure",
        initiative: "Strata Public API",
        start: "2025-10-27",
        status: 20,
        delivery: "2025-12-05",
        spi: 0.8,
        allocation: 1,
        comments: "Initial scope focused on PO document type only",
        scope: "Build a standardized Public API for OrderBahn/Strata exposing key transaction records (Bills, POs, Invoices) and supporting entities through RESTful endpoints with OAuth 2.0 authentication."
    },
    {
        squad: "Core Infrastructure",
        initiative: "Camunda BPM Tools",
        start: "2025-10-15",
        status: 20,
        delivery: "2026-01-20",
        spi: 0.5,
        allocation: 0,
        comments: "Freezze",
        scope: "Implement Camunda for business process mining to identify bottlenecks and process documentation using BPMN notation."
    },
    {
        squad: "Core Infrastructure",
        initiative: "Kibana Observability",
        start: "2025-10-15",
        status: 70,
        delivery: "2025-11-26",
        spi: 9, // Note: This seems like an outlier or error in source, keeping as is
        allocation: 1,
        comments: "Waiting new change to add OB flows",
        scope: "Implement centralized observability with OpenSearch and Kibana for monitoring, logging, and visualizing all key applications (Global Capture, OrderBahn) with real-time dashboards."
    },
    {
        squad: "Core Infrastructure",
        initiative: "DataLake",
        start: "2025-10-27",
        status: 20,
        delivery: "2025-12-05",
        spi: 1.2,
        allocation: 1,
        comments: "Terting Innitial data, Its already working",
        scope: "Establish a scalable, secure data platform supporting OCR document processing, centralized data ingestion, storage, and analytics using Redshift + S3 + Glue/DMS for MVP."
    },
    {
        squad: "Core Infrastructure",
        initiative: "CREST Certification",
        start: "2025-08-22",
        status: 95,
        delivery: "2025-11-28",
        spi: 1.1,
        allocation: 1,
        comments: "Near completion",
        scope: "Security certification process for compliance requirements."
    },
    {
        squad: "Integration",
        initiative: "Agentic OCR",
        start: "2025-10-17",
        status: 90,
        delivery: "2025-12-05",
        spi: 1,
        allocation: 0.5,
        comments: "Spike delivery/missing costs and testing",
        scope: "Document comparison with a knowledge base (BDA) to transform them into digital data and achieve the highest data similarity."
    },
    {
        squad: "Integration",
        initiative: "AI Acknowledge",
        start: "2025-10-27",
        status: 30,
        delivery: "2025-11-05",
        spi: 1,
        allocation: 0.5,
        comments: "2 Layers (OCR and ACK comparison)",
        scope: "Automate the process of comparing and validating Purchase Orders (POs) vs. Acknowledgments (ACKs)."
    },
    {
        squad: "Integration",
        initiative: "RPC CORE",
        start: "2025-10-27",
        status: 85,
        delivery: "2025-11-21",
        spi: 0.9,
        allocation: 1,
        comments: "Delivery of push orders and AI ACK of current schemas",
        scope: "Build a robust, scalable, and secure integration layer that handles communication between internal microservices and the external world."
    },
    {
        squad: "Integration",
        initiative: "Shipment status update",
        start: "2025-11-24",
        status: 0,
        delivery: "2025-12-19",
        spi: 1,
        allocation: 0,
        comments: "Estimate with 1 engineer and current Notion info",
        scope: "Implement an automated system to capture and unify shipment status from multiple data sources."
    },
    {
        squad: "Orderbahn",
        initiative: "Entities Refactor",
        start: "2025-01-01",
        status: 71,
        delivery: "2025-12-18",
        spi: 0.7,
        allocation: 1.5,
        comments: "Ongoing refactoring effort",
        scope: "Refactoring entity management and data structures for improved consistency and maintainability."
    },
    {
        squad: "Orderbahn",
        initiative: "OFS Integration",
        start: "2025-07-01",
        status: 95,
        delivery: "2025-11-06",
        spi: 1,
        allocation: 0,
        comments: "Completed",
        scope: "OFS system integration completed successfully."
    },
    {
        squad: "Orderbahn",
        initiative: "SIF Bulk Import",
        start: "2025-01-01",
        status: 98,
        delivery: "2025-11-11",
        spi: 1,
        allocation: 0,
        comments: "Expected release next sprint",
        scope: "Bulk import functionality for SIF data processing."
    },
    {
        squad: "Orderbahn",
        initiative: "Back Office Governance",
        start: "2025-11-10",
        status: 70,
        delivery: "2025-11-17",
        spi: 0.9,
        allocation: 1,
        comments: "Governance standardization and unified experience",
        scope: "Implement unified governance framework across Back Office modules."
    },
    {
        squad: "Orderbahn",
        initiative: "Cache Infrastructure",
        start: "2025-07-01",
        status: 90,
        delivery: "2025-11-17",
        spi: 1,
        allocation: 0.5,
        comments: "Near completion",
        scope: "Infrastructure optimization for performance improvement."
    },
    {
        squad: "Orderbahn",
        initiative: "Environment Homologation",
        start: "2025-11-10",
        status: 30,
        delivery: "2025-12-19",
        spi: 0.8,
        allocation: 3,
        comments: "Issues with the usage of resources in other priorities",
        scope: "Standardization and alignment of all OrderBahn environments."
    }
];
