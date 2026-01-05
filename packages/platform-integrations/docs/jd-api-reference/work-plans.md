# John Deere Work Plans API

> Reference: [developer.deere.com/dev-docs/work-plans](https://developer.deere.com/dev-docs/work-plans)

## Overview

Work Plans represent planned agricultural operations (planting, harvesting, spraying, tillage) that can be sent to John Deere equipment. They contain prescriptions, equipment assignments, guidance settings, and operator instructions.

**Required Scopes:** `ag1` (view), `ag3` (create/update/delete), `work1` (work plans)

**Base URL:** `https://sandboxapi.deere.com/platform` (sandbox) / `https://partnerapi.deere.com/platform` (production)

---

## Endpoints

### List Work Plans for Organization

```
GET /organizations/{orgId}/workPlans
```

**Headers:**

```
Accept: application/vnd.deere.axiom.v3+json
Authorization: Bearer {access_token}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orgId` | string | Yes | Owning Organization ID |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | string | Filter by calendar year (e.g., `2021`) |
| `workType` | string | Filter by work type. Allowed values: `dtiTillage`, `dtiSeeding`, `dtiApplication`, `dtiHarvest` |
| `workStatus` | string | Filter by work status. Allowed values: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `ALL` |
| `startDate` | datetime | Filter by date range (ISO 8601). Returns work plans created or modified after this date |
| `endDate` | datetime | Filter by date range (ISO 8601). Returns work plans created or modified before this date |
| `pageOffset` | integer | Pagination offset (use with `itemLimit`) |
| `itemLimit` | integer | Number of results per page (use with `pageOffset`) |
| `workPlanErids` | array | Filter to specific work plan ERIDs (comma-separated) |
| `fieldIds` | array | Filter to specific field IDs (comma-separated) |

**Response:** `200 OK`

```json
{
  "links": [
    {
      "rel": "self",
      "uri": "https://sandboxapi.deere.com/platform/organizations/{orgId}/workPlans"
    }
  ],
  "total": 1,
  "values": [
    {
      "links": [
        {
          "rel": "self",
          "uri": "https://sandboxapi.deere.com/platform/organizations/{orgId}/workPlans/{workPlanId}"
        }
      ],
      "erid": "{workPlanId}",
      "location": {
        "fieldUri": "https://sandboxapi.deere.com/platform/organizations/{orgId}/fields/{fieldId}"
      },
      "workType": {
        "representationDomainId": "dtOperationClass",
        "instanceDomainId": "dtiSeeding"
      },
      "year": 2025,
      "operations": [...],
      "workPlanAssignments": [...],
      "guidanceSettings": {...},
      "workStatus": "PLANNED",
      "workOrder": "Sample work order",
      "instructions": "Sample work instructions",
      "sequenceNumber": 1500
    }
  ]
}
```

**Paginated Response:**

```json
{
  "links": [
    {
      "rel": "self",
      "uri": "https://sandboxapi.deere.com/platform/organizations/{orgId}/workPlans?pageOffset=2&itemLimit=2"
    },
    {
      "rel": "nextPage",
      "uri": "https://sandboxapi.deere.com/platform/organizations/{orgId}/workPlans?pageOffset=4&itemLimit=2"
    },
    {
      "rel": "previousPage",
      "uri": "https://sandboxapi.deere.com/platform/organizations/{orgId}/workPlans?pageOffset=0&itemLimit=2"
    }
  ],
  "total": 10,
  "values": [...]
}
```

---

### Get Work Plan

```
GET /organizations/{orgId}/workPlans/{erid}
```

Get a single work plan by erid in the target organization.

**Required Permissions:**
- Work: access level 1
- Locations: access level 1
- Equipment: access level 1
- Organization Management: access level 1

**OAuth Scope:** `work1`

**Headers:**

```
Accept: application/vnd.deere.axiom.v3+json
Authorization: Bearer {access_token}
```

**Path Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `orgId` | string | Yes | Owning Organization ID |
| `erid` | GUID | Yes | Work plan ID unique within target organization |

**Response:** `200 OK`

```json
{
  "links": [
    {
      "rel": "self",
      "uri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/workPlans/{WorkPlanId}"
    }
  ],
  "erid": "{WorkPlanId}",
  "location": {
    "fieldUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/fields/{FieldId}"
  },
  "workType": {
    "representationDomainId": "dtOperationClass",
    "instanceDomainId": "dtiSeeding"
  },
  "year": 2025,
  "operations": [
    {
      "operationType": {
        "representationDomainId": "dtOperationClass",
        "instanceDomainId": "dtiSeeding"
      },
      "operationInputs": [
        {
          "operationProduct": {
            "inputUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/varieties/{VarietyId1}",
            "inputType": "VARIETY",
            "varietySelectionMode": "USER_DEFINED"
          },
          "operationPrescription": {
            "fixedRate": {
              "valueAsDouble": 15000,
              "unit": "seeds1ha-1",
              "vrDomainId": "vrSeedRateSeedsTarget"
            }
          }
        },
        {
          "operationProduct": {
            "inputUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/varieties/{VarietyId2}",
            "inputType": "VARIETY",
            "varietySelectionMode": "USER_DEFINED"
          },
          "operationPrescription": {
            "prescriptionUse": {
              "fileUri": "https://sandboxapi.deere.com/platform/files/{FileId1}",
              "unit": "seeds1ha-1",
              "vrDomainId": "vrSeedRateSeedsTarget",
              "prescriptionLayerUri": "https://api.deere.com/isg/organizations/{OrganizationId}/prescriptions/{PrescriptionId}/prescriptionLayers/{PrescriptionLayerId}",
              "multiplier": {
                "valueAsDouble": 50,
                "unit": "prcnt",
                "vrDomainId": "vrPrescriptionRateMultiplier"
              },
              "multiplierMode": "USER_DEFINED",
              "lookAhead": {
                "valueAsDouble": 2,
                "unit": "sec",
                "vrDomainId": "vrPrescriptionLookAheadTime"
              },
              "lookAheadMode": "USER_DEFINED"
            }
          }
        },
        {
          "operationProduct": {
            "inputUri": "https://sandboxapi.deere.com/platform/cropTypes/{CropName}",
            "inputType": "CROP",
            "varietySelectionMode": "NONE"
          }
        }
      ]
    },
    {
      "operationType": {
        "representationDomainId": "dtOperationClass",
        "instanceDomainId": "dtiApplication"
      },
      "operationInputs": [
        {
          "operationProduct": {
            "inputUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/chemicals/{ChemicalId}",
            "inputType": "CHEMICAL",
            "varietySelectionMode": "NONE"
          },
          "operationPrescription": {
            "fixedRate": {
              "valueAsDouble": 60,
              "unit": "l1ha-1",
              "vrDomainId": "vrAppRateVolumeTarget"
            }
          }
        },
        {
          "operationProduct": {
            "inputUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/chemicals/{FertilizerId}",
            "inputType": "FERTILIZER",
            "varietySelectionMode": "NONE"
          },
          "operationPrescription": {
            "prescriptionUse": {
              "fileUri": "https://sandboxapi.deere.com/platform/files/{FileId2}",
              "unit": "kg1ha-1",
              "vrDomainId": "vrAppRateMassTarget",
              "prescriptionLayerUri": "https://api.deere.com/isg/organizations/{OrganizationId}/prescriptions/{PrescriptionId}/prescriptionLayers/{PrescriptionLayerId}",
              "multiplier": {
                "valueAsDouble": 50,
                "unit": "prcnt",
                "vrDomainId": "vrPrescriptionRateMultiplier"
              },
              "multiplierMode": "USER_DEFINED",
              "lookAhead": {
                "valueAsDouble": 2,
                "unit": "sec",
                "vrDomainId": "vrPrescriptionLookAheadTime"
              },
              "lookAheadMode": "USER_DEFINED"
            }
          }
        }
      ]
    }
  ],
  "workPlanAssignments": [
    {
      "equipmentMachineUri": "https://equipmentapi.deere.com/isg/equipment/{EquipmentId1}",
      "equipmentImplementUris": [
        "https://equipmentapi.deere.com/isg/equipment/{ImplementId1}",
        "https://equipmentapi.deere.com/isg/equipment/{ImplementId2}"
      ]
    },
    {
      "equipmentMachineUri": "https://equipmentapi.deere.com/isg/equipment/{EquipmentId2}",
      "equipmentImplementUris": [
        "https://equipmentapi.deere.com/isg/equipment/{ImplementId3}",
        "https://equipmentapi.deere.com/isg/equipment/{ImplementId4}"
      ]
    }
  ],
  "guidanceSettings": {
    "preferenceSettings": {
      "includeLatestFieldOperation": "NONE",
      "preferenceMode": "USER_SELECTED",
      "entityType": "GUIDANCE_LINE",
      "entityUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/fields/{FieldId}/guidanceLines/{GuidanceId}"
    },
    "includeGuidance": [
      {
        "entityType": "GUIDANCE_LINE",
        "entityUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/fields/{FieldId}/guidanceLines/{GuidanceId}"
      },
      {
        "entityType": "GUIDANCE_PLAN",
        "entityUri": "https://api.deere.com/isg/organizations/{OrganizationId}/guidancePlans/{GuidancePlanId}"
      },
      {
        "entityType": "SOURCE_OPERATION",
        "entityUri": "https://sandboxapi.deere.com/platform/fieldOperations/{FieldOperationId}"
      }
    ]
  },
  "workStatus": "PLANNED",
  "workOrder": "Sample work order",
  "instructions": "Sample work instructions",
  "sequenceNumber": 1500
}
```

---

## Work Types

| Instance Domain ID | Description |
|--------------------|-------------|
| `dtiTillage` | Tillage operations |
| `dtiSeeding` | Planting/seeding operations |
| `dtiApplication` | Chemical/fertilizer application |
| `dtiHarvest` | Harvest operations |

---

## Work Status Values

| Status | Description |
|--------|-------------|
| `PLANNED` | Work plan created but not started |
| `IN_PROGRESS` | Work plan currently being executed |
| `COMPLETED` | Work plan finished |
| `ALL` | Filter parameter to return all statuses |

---

## Response Schema

### WorkPlan Object

| Property | Type | Description |
|----------|------|-------------|
| `erid` | GUID | Unique work plan ID within organization |
| `location` | object | Location where work will be executed |
| `location.fieldUri` | uri | URI to the target field |
| `workType` | object | Work type definition |
| `workType.representationDomainId` | string | Always `"dtOperationClass"` |
| `workType.instanceDomainId` | string | Work type (e.g., `dtiSeeding`, `dtiApplication`) |
| `year` | integer | Calendar year |
| `operations` | Operation[] | Array of operations (1-2 items) |
| `workPlanAssignments` | Assignment[] | Machine/operator/implement assignments |
| `guidanceSettings` | object | Guidance configuration |
| `workStatus` | string | Current status (read-only) |
| `workOrder` | string | Work order grouping (max 255 chars) |
| `instructions` | string | Operator instructions (max 255 chars) |
| `sequenceNumber` | number | Priority indicator (lower = higher priority, read-only) |
| `links` | ApiLink[] | HATEOAS navigation |

### Operation Object

| Property | Type | Description |
|----------|------|-------------|
| `operationType` | object | Operation type definition |
| `operationType.representationDomainId` | string | Always `"dtOperationClass"` |
| `operationType.instanceDomainId` | string | Operation type (e.g., `dtiSeeding`) |
| `operationInputs` | OperationInput[] | Array of inputs (products, prescriptions) |

### OperationInput Object

| Property | Type | Description |
|----------|------|-------------|
| `operationProduct` | object | Product details |
| `operationProduct.inputUri` | uri | URI to the product/chemical/variety |
| `operationProduct.inputType` | string | Type: `CHEMICAL`, `FERTILIZER`, `CROP`, `TANK_MIX`, `VARIETY`, `DRY_BLEND` |
| `operationProduct.varietySelectionMode` | string | `USER_DEFINED`, `USE_VARIETY_LOCATOR`, or `NONE` |
| `operationPrescription` | object | Prescription settings (fixedRate or prescriptionUse) |

### FixedRate Object

| Property | Type | Description |
|----------|------|-------------|
| `valueAsDouble` | number | Rate value |
| `unit` | string | Unit (e.g., `seeds1ha-1`, `l1ha-1`, `kg1ha-1`) |
| `vrDomainId` | string | Variable rate domain ID |

### PrescriptionUse Object

| Property | Type | Description |
|----------|------|-------------|
| `fileUri` | uri | URI to prescription file |
| `unit` | string | Unit for prescription values |
| `vrDomainId` | string | Variable rate domain ID |
| `prescriptionLayerUri` | uri | URI to specific prescription layer |
| `multiplier` | object | Rate multiplier settings |
| `multiplierMode` | string | `USER_DEFINED` |
| `lookAhead` | object | Look-ahead time settings |
| `lookAheadMode` | string | `USER_DEFINED` |

### WorkPlanAssignment Object

| Property | Type | Description |
|----------|------|-------------|
| `equipmentMachineUri` | uri | URI to machine in Equipment API |
| `operatorUri` | uri | URI to operator (optional) |
| `equipmentImplementUris` | uri[] | Array of implement URIs |

### GuidanceSettings Object

| Property | Type | Description |
|----------|------|-------------|
| `preferenceSettings` | object | Preferred guidance settings |
| `preferenceSettings.includeLatestFieldOperation` | string | `NONE` or other values |
| `preferenceSettings.preferenceMode` | string | `USER_SELECTED` |
| `preferenceSettings.entityType` | string | `GUIDANCE_LINE`, `GUIDANCE_PLAN`, etc. |
| `preferenceSettings.entityUri` | uri | URI to preferred guidance entity |
| `includeGuidance` | array | Additional guidance entities to include |

### Guidance Entity Types

| Entity Type | Description |
|-------------|-------------|
| `GUIDANCE_LINE` | A guidance line for the field |
| `GUIDANCE_PLAN` | A guidance plan |
| `SOURCE_OPERATION` | Guidance from a previous field operation |

---

## Common Variable Rate Domain IDs

| vrDomainId | Description |
|------------|-------------|
| `vrSeedRateSeedsTarget` | Seeding rate (seeds) |
| `vrAppRateVolumeTarget` | Application rate (volume) |
| `vrAppRateMassTarget` | Application rate (mass) |
| `vrPrescriptionRateMultiplier` | Prescription rate multiplier |
| `vrPrescriptionLookAheadTime` | Look-ahead time |

---

## Input Types

| Type | Description | Variety Selection Mode |
|------|-------------|----------------------|
| `CROP` | Crop type | `NONE` |
| `VARIETY` | Seed variety | `USER_DEFINED` or `USE_VARIETY_LOCATOR` |
| `CHEMICAL` | Chemical product | `NONE` |
| `FERTILIZER` | Fertilizer product | `NONE` |
| `TANK_MIX` | Tank mix combination | `NONE` |
| `DRY_BLEND` | Dry blend combination | `NONE` |

---

## HTTP Status Codes

| Code | Message | Description |
|------|---------|-------------|
| 200 | OK | Success. For list: work plans in `values` attribute, `total` indicates complete count. For get: single work plan returned |
| 400 | Bad Request | Invalid request parameters. Response body contains failure details |
| 403 | Forbidden | User lacks permission in target organization |
| 404 | Not Found | Requested work plan not found (get endpoint only) |

---

## Example: Complete Work Plan Response

```json
{
  "links": [
    {
      "rel": "self",
      "uri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/workPlans/{WorkPlanId}"
    }
  ],
  "erid": "{WorkPlanId}",
  "location": {
    "fieldUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/fields/{FieldId}"
  },
  "workType": {
    "representationDomainId": "dtOperationClass",
    "instanceDomainId": "dtiSeeding"
  },
  "year": 2025,
  "operations": [
    {
      "operationType": {
        "representationDomainId": "dtOperationClass",
        "instanceDomainId": "dtiSeeding"
      },
      "operationInputs": [
        {
          "operationProduct": {
            "inputUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/varieties/{VarietyId1}",
            "inputType": "VARIETY",
            "varietySelectionMode": "USER_DEFINED"
          },
          "operationPrescription": {
            "fixedRate": {
              "valueAsDouble": 15000,
              "unit": "seeds1ha-1",
              "vrDomainId": "vrSeedRateSeedsTarget"
            }
          }
        },
        {
          "operationProduct": {
            "inputUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/varieties/{VarietyId2}",
            "inputType": "VARIETY",
            "varietySelectionMode": "USER_DEFINED"
          },
          "operationPrescription": {
            "prescriptionUse": {
              "fileUri": "https://sandboxapi.deere.com/platform/files/{FileId1}",
              "unit": "seeds1ha-1",
              "vrDomainId": "vrSeedRateSeedsTarget",
              "prescriptionLayerUri": "https://api.deere.com/isg/organizations/{OrganizationId}/prescriptions/{PrescriptionId}/prescriptionLayers/{PrescriptionLayerId}",
              "multiplier": {
                "valueAsDouble": 50,
                "unit": "prcnt",
                "vrDomainId": "vrPrescriptionRateMultiplier"
              },
              "multiplierMode": "USER_DEFINED",
              "lookAhead": {
                "valueAsDouble": 2,
                "unit": "sec",
                "vrDomainId": "vrPrescriptionLookAheadTime"
              },
              "lookAheadMode": "USER_DEFINED"
            }
          }
        },
        {
          "operationProduct": {
            "inputUri": "https://sandboxapi.deere.com/platform/cropTypes/{CropName}",
            "inputType": "CROP",
            "varietySelectionMode": "NONE"
          }
        }
      ]
    },
    {
      "operationType": {
        "representationDomainId": "dtOperationClass",
        "instanceDomainId": "dtiApplication"
      },
      "operationInputs": [
        {
          "operationProduct": {
            "inputUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/chemicals/{ChemicalId}",
            "inputType": "CHEMICAL",
            "varietySelectionMode": "NONE"
          },
          "operationPrescription": {
            "fixedRate": {
              "valueAsDouble": 60,
              "unit": "l1ha-1",
              "vrDomainId": "vrAppRateVolumeTarget"
            }
          }
        },
        {
          "operationProduct": {
            "inputUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/chemicals/{FertilizerId}",
            "inputType": "FERTILIZER",
            "varietySelectionMode": "NONE"
          },
          "operationPrescription": {
            "prescriptionUse": {
              "fileUri": "https://sandboxapi.deere.com/platform/files/{FileId2}",
              "unit": "kg1ha-1",
              "vrDomainId": "vrAppRateMassTarget",
              "prescriptionLayerUri": "https://api.deere.com/isg/organizations/{OrganizationId}/prescriptions/{PrescriptionId}/prescriptionLayers/{PrescriptionLayerId}",
              "multiplier": {
                "valueAsDouble": 50,
                "unit": "prcnt",
                "vrDomainId": "vrPrescriptionRateMultiplier"
              },
              "multiplierMode": "USER_DEFINED",
              "lookAhead": {
                "valueAsDouble": 2,
                "unit": "sec",
                "vrDomainId": "vrPrescriptionLookAheadTime"
              },
              "lookAheadMode": "USER_DEFINED"
            }
          }
        }
      ]
    }
  ],
  "workPlanAssignments": [
    {
      "equipmentMachineUri": "https://equipmentapi.deere.com/isg/equipment/{EquipmentId1}",
      "equipmentImplementUris": [
        "https://equipmentapi.deere.com/isg/equipment/{ImplementId1}",
        "https://equipmentapi.deere.com/isg/equipment/{ImplementId2}"
      ]
    },
    {
      "equipmentMachineUri": "https://equipmentapi.deere.com/isg/equipment/{EquipmentId2}",
      "equipmentImplementUris": [
        "https://equipmentapi.deere.com/isg/equipment/{ImplementId3}",
        "https://equipmentapi.deere.com/isg/equipment/{ImplementId4}"
      ]
    }
  ],
  "guidanceSettings": {
    "preferenceSettings": {
      "includeLatestFieldOperation": "NONE",
      "preferenceMode": "USER_SELECTED",
      "entityType": "GUIDANCE_LINE",
      "entityUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/fields/{FieldId}/guidanceLines/{GuidanceId}"
    },
    "includeGuidance": [
      {
        "entityType": "GUIDANCE_LINE",
        "entityUri": "https://sandboxapi.deere.com/platform/organizations/{OrganizationId}/fields/{FieldId}/guidanceLines/{GuidanceId}"
      },
      {
        "entityType": "GUIDANCE_PLAN",
        "entityUri": "https://api.deere.com/isg/organizations/{OrganizationId}/guidancePlans/{GuidancePlanId}"
      },
      {
        "entityType": "SOURCE_OPERATION",
        "entityUri": "https://sandboxapi.deere.com/platform/fieldOperations/{FieldOperationId}"
      }
    ]
  },
  "workStatus": "PLANNED",
  "workOrder": "Sample work order",
  "instructions": "Sample work instructions",
  "sequenceNumber": 1500
}
```

---

## Common Use Cases

### Get Single Work Plan by ID

```
GET /organizations/{orgId}/workPlans/{erid}
```

### Get All Seeding Work Plans for 2025

```
GET /organizations/{orgId}/workPlans?year=2025&workType=dtiSeeding
```

### Get Planned Work Plans Only

```
GET /organizations/{orgId}/workPlans?workStatus=PLANNED
```

### Get Work Plans Modified in Date Range

```
GET /organizations/{orgId}/workPlans?startDate=2025-01-01T00:00:00.000Z&endDate=2025-06-01T00:00:00.000Z
```

### Get Work Plans for Specific Fields

```
GET /organizations/{orgId}/workPlans?fieldIds=field-id-1,field-id-2
```

### Paginated Retrieval

```
GET /organizations/{orgId}/workPlans?pageOffset=0&itemLimit=10
GET /organizations/{orgId}/workPlans?pageOffset=10&itemLimit=10
```

---

## Edge Cases & Gotchas

### Operations Array Constraints

- Work plans contain 1-2 operations maximum
- Multi-operation work plans typically combine seeding + application

### Sequence Number

- Read-only field calculated by the API
- Lower numbers = higher priority
- New work plans get higher priority than existing ones (within same work type/year)

### Equipment URIs

- Machine and implement URIs use the Equipment API domain (`equipmentapi.deere.com`)
- Other URIs use the Platform API domain (`sandboxapi.deere.com` or `partnerapi.deere.com`)

### Variety Selection Mode

- Use `USER_DEFINED` for manually selected varieties
- Use `USE_VARIETY_LOCATOR` to let the system select variety
- Use `NONE` for non-variety input types (chemicals, fertilizers, crops)

### Prescription vs Fixed Rate

- Each operation input uses either `fixedRate` OR `prescriptionUse`, never both
- `fixedRate` for uniform application rates
- `prescriptionUse` for variable rate prescriptions

---

## Related Endpoints

- [Fields](./fields.md) - Field metadata
- [Field Operations](./field-operations.md) - Recorded operations (as-applied data)
- [Equipment](./equipment.md) - Machines and implements
- [Products](./products.md) - Chemicals, fertilizers, varieties

