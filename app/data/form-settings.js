module.exports = {
  sections: [
    'client_details',
    'case_details',
    'interests_of_justice',
    'benefits_status',
    'income',
    'capital',
    'check_means_answers',
    'check_means_result',
    'evidence',
    'review',
    'confirm'
  ],
  dependencies: {
    income: ['benefits_status'],
    capital: ['benefits_status', 'case_details'],
    check_means_answers: ['income', 'capital'],
    check_means_result: ['check_means_answers'],
    review: ['client_details','case_details','interests_of_justice','benefits_status'],
    confirm: ['review']
  },
  schemas: {
    'client_details': 'https://raw.githubusercontent.com/ministryofjustice/laa-schemas/main/prototyping/criminal-legal-aid/schemas/client_details.json',
    'case_details': 'https://raw.githubusercontent.com/ministryofjustice/laa-schemas/main/prototyping/criminal-legal-aid/schemas/case_details.json',
    'interests_of_justice': 'https://raw.githubusercontent.com/ministryofjustice/laa-schemas/main/prototyping/criminal-legal-aid/schemas/interests_of_justice.json',
    'benefits_status': 'https://raw.githubusercontent.com/ministryofjustice/laa-schemas/main/prototyping/criminal-legal-aid/schemas/benefits_status.json',
    'income': 'https://raw.githubusercontent.com/ministryofjustice/laa-schemas/main/prototyping/criminal-legal-aid/schemas/means_assessment.json#/definitions/income',
    'capital': 'https://raw.githubusercontent.com/ministryofjustice/laa-schemas/main/prototyping/criminal-legal-aid/schemas/means_assessment.json#/definitions/capital',
    'evidence': 'https://raw.githubusercontent.com/ministryofjustice/laa-schemas/main/prototyping/criminal-legal-aid/schemas/means_assessment.json#/definitions/income'
  },
  statuses: {
    blocked: 'Cannot yet start',
    not_started: 'Not started',
    in_progress: 'In progress',
    not_needed: 'Not needed',
    completed: 'Completed'
  }
};
