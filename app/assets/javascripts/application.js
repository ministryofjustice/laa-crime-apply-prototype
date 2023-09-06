/* global $ */

//
// For guidance on how to add JavaScript see:
// https://prototype-kit.service.gov.uk/docs/adding-css-javascript-and-images
//


$(document).ready(function () {
  MOJFrontend.initAll();

  // postcode lookup
  $('#find-address, .postcode_change a').click(function() {
    $('.togglePostcode').toggleClass('govuk-visually-hidden');
    var postcode = $('input#postcode').val();
    $('label.postcode_change').text(postcode);
  });

  // status tags
  $('.not_started, .blocked').find('.govuk-tag').addClass("govuk-tag--grey");
  $('.not_applicable').find('.govuk-tag').addClass("govuk-tag--grey");
  $('.not_applicable').find('.app-task-list__task-name').children().css({"color":"grey", "pointer-events":"none", "text-decoration":"none"});
  $('.eligible').find('.govuk-tag').addClass("govuk-tag--green");
  $('.eligible').find('.app-task-list__task-name').children().css({"color":"grey", "pointer-events":"none", "text-decoration":"none"});
  $('.in_progress').find('.govuk-tag').addClass("govuk-tag--blue");

  $('#clear-search').on('click', function (e) {
    e.preventDefault()
    $('.search-field').val("");
    $('.search-field').focus();
    $('#proceedings-list').css({ display: "none" });
  });

  $('.search-field').on('input', function (e) {
    $('#proceedings-list').removeAttr('style');
  });
  
  $("[id^='offence-value-']").on('click', function (e) {
    let offenceName = e.currentTarget.dataset.offencename
    let offenceClass = e.currentTarget.dataset.offenceclass

    setOffencesAddedHeading()
    if(this.checked) {
      $('#offence-summary-container').removeAttr('style')
      var $div = $('div[id^="govuk-summary-list__row"]:last');
      var nextRowNumber = parseInt($div.prop("id").match(/\d+/g), 10 ) + 1;
      var $nextRow = $div.clone().prop('id', `govuk-summary-list__row-${nextRowNumber}`).removeAttr('style')
      $div.after($nextRow);
      $(`#govuk-summary-list__row-${nextRowNumber} .offence-name`).text(offenceName);
      $(`#govuk-summary-list__row-${nextRowNumber} .govuk-hint`).text(`Class ${offenceClass}`);
    } else {
      $(".offence-name:contains('" + offenceName + "')").parent().parent().remove();
    }
  });

  $('body').on('click', '#remove-offence-link', function(e) {
    e.preventDefault()
    var offenceName = $(this).parent().siblings()[0].firstElementChild.innerHTML.replace(/&amp;/g, '&');
    $("[data-offencename='" + offenceName + "']" ).prop('checked', false);
    $("dd:contains('" + offenceName + "')").parent().remove();
    
    setOffencesAddedHeading()
  });
 
  function setOffencesAddedHeading() {
    totalSelected = $('input:checkbox:checked').length
    if (totalSelected > 0) {
      var text
      if (totalSelected == 1) {
        text = `You have added 1 offence`
      } else {
        text = `You have added ${totalSelected} offences`
      }
      $('#offence-summary-heading').text(text).removeAttr('style')
    } else {
        $('#offence-summary-heading').parent().parent().css({ display: "none" });
    }
  }

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
