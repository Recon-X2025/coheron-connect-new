export const payrollLocalizations = [
  {
    "country_code": "IN",
    "country_name": "India",
    "is_active": true,
    "tax_config": {
      "tax_brackets": [
        {
          "from": 0,
          "to": 300000,
          "rate": 0,
          "cess_rate": 4
        },
        {
          "from": 300001,
          "to": 600000,
          "rate": 5,
          "cess_rate": 4
        },
        {
          "from": 600001,
          "to": 900000,
          "rate": 10,
          "cess_rate": 4
        },
        {
          "from": 900001,
          "to": 1200000,
          "rate": 15,
          "cess_rate": 4
        },
        {
          "from": 1200001,
          "to": 1500000,
          "rate": 20,
          "cess_rate": 4
        },
        {
          "from": 1500001,
          "to": 999999999,
          "rate": 30,
          "cess_rate": 4
        }
      ],
      "standard_deduction": 75000,
      "exemptions": [
        {
          "name": "Section 80C",
          "max_amount": 150000,
          "section": "80C"
        },
        {
          "name": "Section 80D",
          "max_amount": 25000,
          "section": "80D"
        },
        {
          "name": "NPS",
          "max_amount": 50000,
          "section": "80CCD(1B)"
        }
      ]
    },
    "social_security": {
      "components": [
        {
          "name": "EPF",
          "employee_rate": 12,
          "employer_rate": 12,
          "max_basis": 15000,
          "is_mandatory": true
        },
        {
          "name": "ESI",
          "employee_rate": 0.75,
          "employer_rate": 3.25,
          "max_basis": 21000,
          "is_mandatory": true
        }
      ]
    },
    "statutory_components": [
      {
        "name": "Professional Tax",
        "type": "deduction",
        "calculation": "slab",
        "rate": 0,
        "max_amount": 2500,
        "employer_share": 0,
        "employee_share": 200,
        "is_mandatory": true,
        "applicable_to": "all"
      },
      {
        "name": "TDS",
        "type": "tax",
        "calculation": "slab",
        "rate": 0,
        "is_mandatory": true,
        "applicable_to": "all"
      }
    ],
    "payment_config": {
      "currency": "INR",
      "payment_methods": [
        "bank_transfer"
      ],
      "tax_year_start_month": 4,
      "pay_frequency_options": [
        "monthly"
      ]
    },
    "compliance_reports": [
      {
        "name": "Form 16",
        "frequency": "annual"
      },
      {
        "name": "PF Return",
        "frequency": "monthly"
      },
      {
        "name": "ESI Return",
        "frequency": "monthly"
      },
      {
        "name": "Professional Tax Return",
        "frequency": "monthly"
      },
      {
        "name": "TDS Return (24Q)",
        "frequency": "quarterly"
      }
    ]
  },
  {
    "country_code": "US",
    "country_name": "United States",
    "is_active": true,
    "tax_config": {
      "tax_brackets": [
        {
          "from": 0,
          "to": 11600,
          "rate": 10,
          "cess_rate": 0
        },
        {
          "from": 11601,
          "to": 47150,
          "rate": 12,
          "cess_rate": 0
        },
        {
          "from": 47151,
          "to": 100525,
          "rate": 22,
          "cess_rate": 0
        },
        {
          "from": 100526,
          "to": 191950,
          "rate": 24,
          "cess_rate": 0
        },
        {
          "from": 191951,
          "to": 243725,
          "rate": 32,
          "cess_rate": 0
        },
        {
          "from": 243726,
          "to": 609350,
          "rate": 35,
          "cess_rate": 0
        },
        {
          "from": 609351,
          "to": 999999999,
          "rate": 37,
          "cess_rate": 0
        }
      ],
      "standard_deduction": 14600,
      "exemptions": []
    },
    "social_security": {
      "components": [
        {
          "name": "Social Security",
          "employee_rate": 6.2,
          "employer_rate": 6.2,
          "max_basis": 168600,
          "is_mandatory": true
        },
        {
          "name": "Medicare",
          "employee_rate": 1.45,
          "employer_rate": 1.45,
          "is_mandatory": true
        }
      ]
    },
    "statutory_components": [
      {
        "name": "FUTA",
        "type": "contribution",
        "calculation": "percentage",
        "rate": 6,
        "max_amount": 420,
        "employer_share": 6,
        "employee_share": 0,
        "is_mandatory": true,
        "applicable_to": "all"
      },
      {
        "name": "State Withholding",
        "type": "tax",
        "calculation": "slab",
        "rate": 0,
        "is_mandatory": false,
        "applicable_to": "all"
      }
    ],
    "payment_config": {
      "currency": "USD",
      "payment_methods": [
        "bank_transfer",
        "check"
      ],
      "tax_year_start_month": 1,
      "pay_frequency_options": [
        "monthly",
        "biweekly",
        "weekly"
      ]
    },
    "compliance_reports": [
      {
        "name": "W-2",
        "frequency": "annual"
      },
      {
        "name": "941 Quarterly",
        "frequency": "quarterly"
      },
      {
        "name": "940 Annual",
        "frequency": "annual"
      }
    ]
  },
  {
    "country_code": "GB",
    "country_name": "United Kingdom",
    "is_active": true,
    "tax_config": {
      "tax_brackets": [
        {
          "from": 0,
          "to": 12570,
          "rate": 0,
          "cess_rate": 0
        },
        {
          "from": 12571,
          "to": 50270,
          "rate": 20,
          "cess_rate": 0
        },
        {
          "from": 50271,
          "to": 125140,
          "rate": 40,
          "cess_rate": 0
        },
        {
          "from": 125141,
          "to": 999999999,
          "rate": 45,
          "cess_rate": 0
        }
      ],
      "standard_deduction": 0,
      "exemptions": []
    },
    "social_security": {
      "components": [
        {
          "name": "National Insurance Class 1",
          "employee_rate": 12,
          "employer_rate": 13.8,
          "max_basis": 50270,
          "is_mandatory": true
        }
      ]
    },
    "statutory_components": [
      {
        "name": "Student Loan Plan 2",
        "type": "deduction",
        "calculation": "percentage",
        "rate": 9,
        "threshold": 27295,
        "employer_share": 0,
        "employee_share": 9,
        "is_mandatory": false,
        "applicable_to": "above_threshold"
      },
      {
        "name": "Pension Auto-Enrollment",
        "type": "contribution",
        "calculation": "percentage",
        "rate": 8,
        "employer_share": 3,
        "employee_share": 5,
        "is_mandatory": true,
        "applicable_to": "all"
      }
    ],
    "payment_config": {
      "currency": "GBP",
      "payment_methods": [
        "bank_transfer"
      ],
      "tax_year_start_month": 4,
      "pay_frequency_options": [
        "monthly",
        "weekly"
      ]
    },
    "compliance_reports": [
      {
        "name": "P60",
        "frequency": "annual"
      },
      {
        "name": "RTI FPS",
        "frequency": "monthly"
      },
      {
        "name": "P11D",
        "frequency": "annual"
      }
    ]
  },
  {
    "country_code": "DE",
    "country_name": "Germany",
    "is_active": true,
    "tax_config": {
      "tax_brackets": [
        {
          "from": 0,
          "to": 11604,
          "rate": 0,
          "cess_rate": 0
        },
        {
          "from": 11605,
          "to": 17005,
          "rate": 14,
          "cess_rate": 0
        },
        {
          "from": 17006,
          "to": 66760,
          "rate": 24,
          "cess_rate": 0
        },
        {
          "from": 66761,
          "to": 277825,
          "rate": 42,
          "cess_rate": 0
        },
        {
          "from": 277826,
          "to": 999999999,
          "rate": 45,
          "cess_rate": 0
        }
      ],
      "standard_deduction": 0,
      "exemptions": []
    },
    "social_security": {
      "components": [
        {
          "name": "Health Insurance",
          "employee_rate": 7.3,
          "employer_rate": 7.3,
          "max_basis": 62100,
          "is_mandatory": true
        },
        {
          "name": "Pension Insurance",
          "employee_rate": 9.3,
          "employer_rate": 9.3,
          "max_basis": 90600,
          "is_mandatory": true
        },
        {
          "name": "Unemployment Insurance",
          "employee_rate": 1.3,
          "employer_rate": 1.3,
          "max_basis": 90600,
          "is_mandatory": true
        }
      ]
    },
    "statutory_components": [
      {
        "name": "Solidarity Surcharge",
        "type": "tax",
        "calculation": "percentage",
        "rate": 5.5,
        "is_mandatory": false,
        "applicable_to": "above_threshold",
        "threshold": 18130,
        "employer_share": 0,
        "employee_share": 5.5
      },
      {
        "name": "Church Tax",
        "type": "tax",
        "calculation": "percentage",
        "rate": 9,
        "is_mandatory": false,
        "applicable_to": "all",
        "employer_share": 0,
        "employee_share": 9
      }
    ],
    "payment_config": {
      "currency": "EUR",
      "payment_methods": [
        "bank_transfer"
      ],
      "tax_year_start_month": 1,
      "pay_frequency_options": [
        "monthly"
      ]
    },
    "compliance_reports": [
      {
        "name": "Lohnsteueranmeldung",
        "frequency": "monthly"
      },
      {
        "name": "Sozialversicherungsmeldung",
        "frequency": "monthly"
      },
      {
        "name": "Jahresmeldung",
        "frequency": "annual"
      }
    ]
  },
  {
    "country_code": "AE",
    "country_name": "United Arab Emirates",
    "is_active": true,
    "tax_config": {
      "tax_brackets": [
        {
          "from": 0,
          "to": 999999999,
          "rate": 0,
          "cess_rate": 0
        }
      ],
      "standard_deduction": 0,
      "exemptions": []
    },
    "social_security": {
      "components": []
    },
    "statutory_components": [
      {
        "name": "End of Service Gratuity (1-5 yrs)",
        "type": "contribution",
        "calculation": "fixed",
        "rate": 0,
        "employer_share": 21,
        "employee_share": 0,
        "is_mandatory": true,
        "applicable_to": "all"
      },
      {
        "name": "End of Service Gratuity (5+ yrs)",
        "type": "contribution",
        "calculation": "fixed",
        "rate": 0,
        "employer_share": 30,
        "employee_share": 0,
        "is_mandatory": true,
        "applicable_to": "all"
      },
      {
        "name": "WPS Compliance",
        "type": "contribution",
        "calculation": "fixed",
        "rate": 0,
        "is_mandatory": true,
        "applicable_to": "all"
      }
    ],
    "payment_config": {
      "currency": "AED",
      "payment_methods": [
        "bank_transfer"
      ],
      "tax_year_start_month": 1,
      "pay_frequency_options": [
        "monthly"
      ]
    },
    "compliance_reports": [
      {
        "name": "WPS Report",
        "frequency": "monthly"
      },
      {
        "name": "MOHRE Report",
        "frequency": "annual"
      },
      {
        "name": "Gratuity Provision Report",
        "frequency": "annual"
      }
    ]
  },
  {
    "country_code": "SG",
    "country_name": "Singapore",
    "is_active": true,
    "tax_config": {
      "tax_brackets": [
        {
          "from": 0,
          "to": 20000,
          "rate": 0,
          "cess_rate": 0
        },
        {
          "from": 20001,
          "to": 30000,
          "rate": 2,
          "cess_rate": 0
        },
        {
          "from": 30001,
          "to": 40000,
          "rate": 3.5,
          "cess_rate": 0
        },
        {
          "from": 40001,
          "to": 80000,
          "rate": 7,
          "cess_rate": 0
        },
        {
          "from": 80001,
          "to": 120000,
          "rate": 11.5,
          "cess_rate": 0
        },
        {
          "from": 120001,
          "to": 160000,
          "rate": 15,
          "cess_rate": 0
        },
        {
          "from": 160001,
          "to": 200000,
          "rate": 18,
          "cess_rate": 0
        },
        {
          "from": 200001,
          "to": 240000,
          "rate": 19,
          "cess_rate": 0
        },
        {
          "from": 240001,
          "to": 280000,
          "rate": 19.5,
          "cess_rate": 0
        },
        {
          "from": 280001,
          "to": 320000,
          "rate": 20,
          "cess_rate": 0
        },
        {
          "from": 320001,
          "to": 999999999,
          "rate": 22,
          "cess_rate": 0
        }
      ],
      "standard_deduction": 0,
      "exemptions": []
    },
    "social_security": {
      "components": [
        {
          "name": "CPF Ordinary",
          "employee_rate": 20,
          "employer_rate": 17,
          "max_basis": 6800,
          "is_mandatory": true
        }
      ]
    },
    "statutory_components": [
      {
        "name": "SDL",
        "type": "contribution",
        "calculation": "percentage",
        "rate": 0.25,
        "employer_share": 0.25,
        "employee_share": 0,
        "is_mandatory": true,
        "applicable_to": "all"
      }
    ],
    "payment_config": {
      "currency": "SGD",
      "payment_methods": [
        "bank_transfer"
      ],
      "tax_year_start_month": 1,
      "pay_frequency_options": [
        "monthly"
      ]
    },
    "compliance_reports": [
      {
        "name": "IR8A",
        "frequency": "annual"
      },
      {
        "name": "CPF Submission",
        "frequency": "monthly"
      },
      {
        "name": "SDL Return",
        "frequency": "monthly"
      }
    ]
  },
  {
    "country_code": "AU",
    "country_name": "Australia",
    "is_active": true,
    "tax_config": {
      "tax_brackets": [
        {
          "from": 0,
          "to": 18200,
          "rate": 0,
          "cess_rate": 0
        },
        {
          "from": 18201,
          "to": 45000,
          "rate": 19,
          "cess_rate": 0
        },
        {
          "from": 45001,
          "to": 120000,
          "rate": 32.5,
          "cess_rate": 0
        },
        {
          "from": 120001,
          "to": 180000,
          "rate": 37,
          "cess_rate": 0
        },
        {
          "from": 180001,
          "to": 999999999,
          "rate": 45,
          "cess_rate": 0
        }
      ],
      "standard_deduction": 0,
      "exemptions": []
    },
    "social_security": {
      "components": []
    },
    "statutory_components": [
      {
        "name": "Superannuation",
        "type": "contribution",
        "calculation": "percentage",
        "rate": 11.5,
        "employer_share": 11.5,
        "employee_share": 0,
        "is_mandatory": true,
        "applicable_to": "all"
      },
      {
        "name": "Medicare Levy",
        "type": "tax",
        "calculation": "percentage",
        "rate": 2,
        "employer_share": 0,
        "employee_share": 2,
        "is_mandatory": true,
        "applicable_to": "all"
      },
      {
        "name": "HECS-HELP",
        "type": "deduction",
        "calculation": "slab",
        "rate": 0,
        "is_mandatory": false,
        "applicable_to": "above_threshold",
        "threshold": 51550
      }
    ],
    "payment_config": {
      "currency": "AUD",
      "payment_methods": [
        "bank_transfer"
      ],
      "tax_year_start_month": 7,
      "pay_frequency_options": [
        "monthly",
        "biweekly",
        "weekly"
      ]
    },
    "compliance_reports": [
      {
        "name": "PAYG Summary",
        "frequency": "annual"
      },
      {
        "name": "BAS",
        "frequency": "quarterly"
      },
      {
        "name": "Super Guarantee Statement",
        "frequency": "quarterly"
      }
    ]
  }
];