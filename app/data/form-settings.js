module.exports = {
  sections: [
    'client_details',
    'case_details',
    'offence_details',
    'interests_of_justice',
    'check_benefits',
    'means_assessment',
    'capital_assessment',
    'evidence',
    'review'
  ],
  dependencies: {
    means_assessment: ['check_benefits'],
    capital_assessment: ['check_benefits', 'case_details'],
    review: ['client_details','case_details','offence_details','interests_of_justice','check_benefits','means_assessment','capital_assessment']
  },
  statuses: {
    blocked: 'Cannot yet start',
    not_started: 'Not started',
    in_progress: 'In progress',
    not_needed: 'Not needed',
    completed: 'Completed'
  }
};
