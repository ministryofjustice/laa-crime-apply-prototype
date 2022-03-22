/* global $ */

// Warn about using the kit in production
if (window.console && window.console.info) {
  window.console.info('GOV.UK Prototype Kit - do not use for production')
}

$(document).ready(function () {
  window.GOVUKFrontend.initAll()
  MOJFrontend.initAll();

  // postcode lookup
  $('#find-address, .postcode_change a').click(function() {
    $('.togglePostcode').toggleClass('govuk-visually-hidden');
    var postcode = $('input#postcode').val();
    $('label.postcode_change').text(postcode);
  });

  // status tags
  $('.not_started, .blocked').find('.govuk-tag').addClass("govuk-tag--grey");
  $('.in_progress').find('.govuk-tag').addClass("govuk-tag--blue");

  $('#clear-search').on('click', function (e) {
    e.preventDefault()
    $('.search-field').val("");
    $('.search-field').focus();
  });

  // file uploads
  var fileUpload = $('.moj-multi-file-upload');
  if(fileUpload && typeof MOJFrontend.MultiFileUpload !== 'undefined') {
    new MOJFrontend.MultiFileUpload({
      container: $('.moj-multi-file-upload'),
      uploadUrl: '/ajax-upload-url',
      deleteUrl: '/ajax-delete-url'
    });
  }
})
