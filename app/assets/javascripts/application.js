/* global $ */

// Warn about using the kit in production
if (window.console && window.console.info) {
  window.console.info('GOV.UK Prototype Kit - do not use for production')
}

$(document).ready(function () {
  window.GOVUKFrontend.initAll()

  // postcode lookup
  $('#find-address, .postcode_change a').click(function() {
    $('.togglePostcode').toggleClass('govuk-visually-hidden');
    var postcode = $('input#postcode').val();
    $('label.postcode_change').text(postcode);
  });

  // status tags
  $('.not_started, .blocked').find('.govuk-tag').addClass("govuk-tag--grey");
  $('.in_progress').find('.govuk-tag').addClass("govuk-tag--blue");

  // file uploads
  if(typeof MOJFrontend.MultiFileUpload !== 'undefined') {
    new MOJFrontend.MultiFileUpload({
      container: $('.moj-multi-file-upload'),
      uploadUrl: '/ajax-upload-url',
      deleteUrl: '/ajax-delete-url'
    });
  }
})
