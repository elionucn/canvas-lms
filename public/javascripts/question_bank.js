/*
 * Copyright (C) 2011 - present Instructure, Inc.
 *
 * This file is part of Canvas.
 *
 * Canvas is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Affero General Public License as published by the Free
 * Software Foundation, version 3 of the License.
 *
 * Canvas is distributed in the hope that it will be useful, but WITHOUT ANY
 * WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 * A PARTICULAR PURPOSE. See the GNU Affero General Public License for more
 * details.
 *
 * You should have received a copy of the GNU Affero General Public License along
 * with this program. If not, see <http://www.gnu.org/licenses/>.
 */

import I18n from 'i18n!question_bank'
import $ from 'jquery'
import find_outcome from './find_outcome'
import moveQuestionTemplate from 'jst/quiz/move_question'
import htmlEscape from './str/htmlEscape'
import moveMultipleQuestionBanks from 'jsx/quizzes/question_bank/moveMultipleQuestionBanks'
import loadBanks from 'jsx/quizzes/question_bank/loadBanks'
import addBank from 'jsx/quizzes/question_bank/addBank'
import './jquery.ajaxJSON'
import './jquery.instructure_forms' /* formSubmit, getFormData, formErrors */
import 'jqueryui/dialog'
import './jquery.instructure_misc_helpers' /* replaceTags */
import './jquery.instructure_misc_plugins' /* confirmDelete, showIf, .dim */
import './jquery.keycodes'
import './jquery.loadingImg'
import './jquery.templateData'

export function updateAlignments (alignments) {
      $(".add_outcome_text").text(I18n.t("updating_outcomes", "Updating Outcomes...")).attr('disabled', true);
      var params = {};
      for(var idx in alignments) {
        var alignment = alignments[idx];
        params['assessment_question_bank[alignments][' + alignment[0] + ']'] = alignment[1];
      }
      if(alignments.length == 0) {
        params['assessment_question_bank[alignments]'] = '';
      }
      var url = $(".edit_bank_link:last").attr('href');
      $.ajaxJSON(url, 'PUT', params, data => {
        var alignments = data.assessment_question_bank.learning_outcome_alignments.sort((a, b) => {
          var a_name = ((a.content_tag && a.content_tag.learning_outcome && a.content_tag.learning_outcome.short_description) || 'none').toLowerCase();
          var b_name = ((b.content_tag && b.content_tag.learning_outcome && b.content_tag.learning_outcome.short_description) || 'none').toLowerCase();
          if(a_name < b_name) { return -1; }
          else if(a_name > b_name) { return 1; }
          else { return 0; }
        });
        $(".add_outcome_text").text(I18n.t("align_outcomes", "Align Outcomes")).attr('disabled', false);
        var $outcomes = $("#aligned_outcomes_list");
        $outcomes.find(".outcome:not(.blank)").remove();
        var $template = $outcomes.find(".blank:first").clone(true).removeClass('blank');
        for(var idx in alignments) {
          var alignment = alignments[idx].content_tag;
            var outcome = {
              short_description: alignment.learning_outcome.short_description,
              mastery_threshold: Math.round(alignment.mastery_score * 10000) / 100.0
            };
            var $outcome = $template.clone(true);
            $outcome.attr('data-id', alignment.learning_outcome_id);
            $outcome.fillTemplateData({
              data: outcome
            });
            $outcomes.append($outcome.show());
        }
      }, data => {
        $(".add_outcome_text").text(I18n.t("update_outcomes_fail", "Updating Outcomes Failed")).attr('disabled', false);
      });
    }

export function attachPageEvents(e) {
      $("#aligned_outcomes_list").delegate('.delete_outcome_link', 'click', function(event) {
        event.preventDefault();
        var result = confirm(I18n.t("remove_outcome_from_bank", "Are you sure you want to remove this outcome from the bank?")),
            $outcome = $(event.target).parents('.outcome'),
            alignments = [],
            outcome_id = $outcome.data('id');

        if (result) {
          $outcome.dim()
          $("#aligned_outcomes_list .outcome:not(.blank)").each(function() {
            var id = $(this).attr('data-id');
            var pct = $(this).getTemplateData({textValues: ['mastery_threshold']}).mastery_threshold / 100;
            if(id != outcome_id) {
              alignments.push([id, pct]);
            }
          });
          updateAlignments(alignments);
        }
      });

      if($("#more_questions").length > 0) {
        $(".display_question .move").remove();
        var url = $.replaceTags($("#bank_urls .more_questions_url").attr('href'), 'page', 1);
        $.ajaxJSON(url, 'GET', {}, data => {
          for(var idx in data.questions) {
            var question = data.questions[idx].assessment_question;
            var $teaser = $("#question_teaser_" + question.id);
            $teaser.data('question', question);
          }
        }, data => {
        });
      }
      $(".more_questions_link").click(function(event) {
        event.preventDefault();
        if($(this).hasClass('loading')) { return; }
        var $link = $(this);
        var $more_questions = $("#more_questions");
        var currentPage = parseInt($more_questions.attr('data-current-page'));
        var totalPages = parseInt($more_questions.attr('data-total-pages'));
        var url = $(this).attr('href');
        url = $.replaceTags(url, 'page', currentPage + 1);
        $link.text("loading more questions...").addClass('loading');
        $.ajaxJSON(url, 'GET', {}, data => {
          $link.text(I18n.t('links.more_questions', "more questions")).removeClass('loading');
          $more_questions.attr('data-current-page', currentPage + 1);
          $more_questions.showIf(currentPage + 1 < totalPages);
          for(var idx in data.questions) {
            var question = data.questions[idx].assessment_question;
            question.assessment_question_id = question.id;
            var $question = $("#question_teaser_blank").clone().removeAttr('id');
            $question.fillTemplateData({
              data: question,
              id: 'question_teaser_' + question.id,
              hrefValues: ['id']
            });
            $question.fillTemplateData({
              data: question.question_data,
              htmlValues: ['question_text']
            });
            $question.data('question', question);
	    $question.find(".assessment_question_id").text(question.id);
            $("#questions").append($question);
            $question.show();
          }
        }, () => {
          $link.text(I18n.t('loading_more_fail', "loading more questions fails, please try again")).removeClass('loading');
        });
      });
      $(".delete_bank_link").click(function(event) {
        event.preventDefault();
        $(this).parents(".question_bank").confirmDelete({
          url: $(this).attr('href'),
          message: I18n.t('delete_are_you_sure', "Are you sure you want to delete this bank of questions?"),
          success: function() {
            location.href = $(".assessment_question_banks_url").attr('href');
          }
        });
      });
      $(".bookmark_bank_link").click(function(event) {
        event.preventDefault();
        var $link = $(this);
        $link.find(".message").text(I18n.t('bookmarking', "Bookmarking..."));
        $.ajaxJSON($(this).attr('href'), 'POST', {}, data => {
          $link.find('.message').text(I18n.t('already_bookmarked', 'Already Bookmarked'));
          $link.attr('disabled', true);
        }, () => {
          $link.find(".message").text(I18n.t('bookmark_failed', "Bookmark Failed"));
        });
      });
      $(".edit_bank_link").click(event => {
        event.preventDefault();
        var val = $("#edit_bank_form h2").text();
        $("#edit_bank_form").find(".displaying").hide().end()
          .find(".editing").show();
        $(".bank_name_box").val(val || I18n.t('question_bank', "Question Bank")).focus().select();
      });
      $("#edit_bank_form .bank_name_box").keycodes('return esc', function(event) {
        if(event.keyString == 'esc') {
          $(this).blur();
        } else if(event.keyString == 'return') {
          $("#edit_bank_form").submit();
        }
      });
      $("#edit_bank_form .bank_name_box").blur(() => {
        $("#edit_bank_form").find(".displaying").show().end()
          .find(".editing").hide();
      });
      $("#edit_bank_form").formSubmit({
        object_name: 'assessment_question_bank',
        beforeSubmit: function(data) {
          $("#edit_bank_form h2").text(data.title);
          $(this).loadingImage();
        },
        success: function(data) {
          $(this).loadingImage('remove');
          var bank = data.assessment_question_bank;
          $("#edit_bank_form .bank_name_box").blur();
          $("#edit_bank_form h2").text(bank.title);
        },
        error: function(data) {
          $(this).loadingImage('remove');
          $(".edit_bank_link").click();
          $("#edit_bank_form").formErrors(data);
        }
      });
      $("#show_question_details").change(function() {
        $("#questions").toggleClass('brief', !$(this).attr('checked'));
      }).change();

      moveMultipleQuestionBanks.addEvents()

      $("#questions").delegate(".move_question_link", 'click', function(event) {
        event.preventDefault();
        var $dialog = $("#move_question_dialog");
        $dialog.find(".question_text").show().end()
          .find(".questions").hide();
        $dialog.find(".copy_option").show();
        $dialog.find(".submit_button").text(I18n.t('title.move_copy_questions', "Move/Copy Questions"));
        $dialog.find(".multiple_questions").val("0");
        if(!$dialog.hasClass('loaded')) {
          loadBanks($dialog);
        } else {
          $dialog.find("li.message").hide();
        }
        var template = $(this).parents(".question_holder").getTemplateData({textValues: ['question_name', 'question_text']});
        $dialog.fillTemplateData({
          data: template
        });
        $dialog.data('question', $(this).parents(".question_holder"));
        $dialog.dialog({
          width: 600,
          title: I18n.t('title.move_copy_questions', "Move/Copy Questions")
        });
        $dialog.parent().find('.ui-dialog-titlebar-close').focus();
      });
      $("#move_question_dialog .submit_button").click(function() {
        var $dialog = $("#move_question_dialog");
        var data = $dialog.getFormData();
        var multiple_questions = data.multiple_questions == '1';
        var move = data.copy != '1';
        var submitText = null;
        if(move){
          submitText = I18n.t("buttons.submit_moving", { one: "Moving Question...", other: "Moving Questions..."}, {count: multiple_questions ? 2 : 1})
        } else {
          submitText = I18n.t("buttons.submit_copying", { one: "Copying Question...", other: "Copying Questions..."}, {count: multiple_questions ? 2 : 1})
        }
        $dialog.find("button").attr('disabled', true);
        $dialog.find(".submit_button").text(submitText);
        var url = $("#bank_urls .move_questions_url").attr('href');
        data['move'] = move ? '1' : '0';
        if(!multiple_questions) {
          var id = $dialog.data('question').find(".assessment_question_id").text();
          data['questions[' + id + ']'] = '1';
        }
        var ids = [];
        $dialog.find(".list_question :checkbox:checked").each(function() {
          ids.push($(this).val());
        });
        var save = function(data) {
          $.ajaxJSON(url, 'POST', data, data => {
            $dialog.find("button").attr('disabled', false);
            $dialog.find(".submit_button").text("Move/Copy Question");
            if(move) {
              if($dialog.data('question')) {
                $dialog.data('question').remove();
              } else {
                for(var idx in ids) {
                  var id = ids[idx];
                  $("#question_" + id).parent(".question_holder").remove();
                  $("#question_teaser_" + id).remove();
                }
                $dialog.find
              }
            }
            $dialog.dialog('close');
          }, data => {
            $dialog.find("button").attr('disabled', false);
            var failedText = null;
            if(move){
              failedText = I18n.t("buttons.submit_moving_failed", { one: "Moving Question Failed, please try again", other: "Moving Questions Failed, please try again"}, {count: multiple_questions ? 2 : 1})
            } else {
              failedText = I18n.t("buttons.submit_copying_failed", { one: "Copying Question Failed, please try again", other: "Copying Questions Failed, please try again"}, {count: multiple_questions ? 2 : 1})
            }
            $dialog.find(".submit_button").text(failedText);
          });
        }
        if(data.assessment_question_bank_id == "new") {
          var create_url = $("#bank_urls .assessment_question_banks_url").attr('href');
          $.ajaxJSON(create_url, 'POST', {'assessment_question_bank[title]': data.assessment_question_bank_name}, bank_data => {
            addBank(bank_data.assessment_question_bank);
            data['assessment_question_bank_id'] = bank_data.assessment_question_bank.id;
            $dialog.find(".new_question_bank_name").hide();
            save(data);
          }, data => {
            $dialog.find("button").attr('disabled', false);
            var submitAgainText = null;
            if(move){
              submitAgainText = I18n.t("buttons.submit_retry_moving", "Moving Question Failed, please try again...")
            } else {
              submitAgainText = I18n.t("buttons.submit_retry_copying", "Copying Question Failed, please try again...")
            }
            $dialog.find(".submit_button").text(submitAgainText);
          });
        } else {
          save(data);
        }
      });
      $("#move_question_dialog .cancel_button").click(() => {
        $("#move_question_dialog").dialog('close');
      });
      $("#move_question_dialog :radio").change(function() {
        $("#move_question_dialog .new_question_bank_name").showIf($(this).attr('checked') && $(this).val() == 'new');
      });
    }
