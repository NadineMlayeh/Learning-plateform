const errorMessageToKey = {
  'All courses must be published before publishing the formation': 'allCoursesMustBePublished',
  'Course must have at least 1 lesson': 'courseMustHaveAtLeastOneLesson',
  'Course must have at least 3 quizzes': 'courseMustHaveAtLeastThreeQuizzes',
  'Published formation cannot be altered': 'publishedFormationCannotBeAltered',
  'Presentiel formation cannot contain online courses': 'presentielFormationCannotContainOnlineCourses',
  'Only pending (draft) courses can be deleted': 'onlyPendingCoursesCanBeDeleted',
  'Title cannot be empty': 'titleCannotBeEmpty',
  'Description cannot be empty': 'descriptionCannotBeEmpty',
  'Price must be a valid non-negative number': 'priceMustBeValidNonNegativeNumber',
  'Invalid formation type': 'invalidFormationType',
  'Invalid start date': 'invalidStartDate',
  'Invalid end date': 'invalidEndDate',
  'Course title cannot be empty': 'courseTitleCannotBeEmpty',
  'At least one editable field is required': 'atLeastOneEditableFieldRequired',
};

export function getErrorTranslationKey(message) {
  return errorMessageToKey[message] || null;
}