/*
 * Copyright (C) 2017 - present Instructure, Inc.
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

import {bindActionCreators} from 'redux'
import {bool, func, number, string} from 'prop-types'
import {connect} from 'react-redux'
import {debounce} from 'lodash'
import I18n from 'i18n!announcements_v2'
import React, {Component} from 'react'
import {Button} from '@instructure/ui-buttons'
import {FormField} from '@instructure/ui-form-field'
import {Grid, View} from '@instructure/ui-layout'
import {
  IconLockLine,
  IconPlusLine,
  IconSearchLine,
  IconTrashLine,
  IconUnlockLine
} from '@instructure/ui-icons'
import {PresentationContent, ScreenReaderContent} from '@instructure/ui-a11y'
import {TextInput} from '@instructure/ui-forms'

import actions from '../actions'
import ExternalFeedsTray from './ExternalFeedsTray'
import propTypes from '../propTypes'
import select from '../../shared/select'
import {showConfirmDelete} from './ConfirmDeleteModal'

// Delay the search so as not to overzealously read out the number
// of search results to the user
export const SEARCH_TIME_DELAY = 750
const filters = {
  all: I18n.t('All'),
  unread: I18n.t('Unread')
}
export default class IndexHeader extends Component {
  static propTypes = {
    contextType: string.isRequired,
    contextId: string.isRequired,
    isBusy: bool,
    selectedCount: number,
    isToggleLocking: bool.isRequired,
    permissions: propTypes.permissions.isRequired,
    atomFeedUrl: string,
    searchAnnouncements: func.isRequired,
    toggleSelectedAnnouncementsLock: func.isRequired,
    deleteSelectedAnnouncements: func.isRequired,
    searchInputRef: func,
    announcementsLocked: bool.isRequired
  }

  static defaultProps = {
    isBusy: false,
    atomFeedUrl: null,
    selectedCount: 0,
    searchInputRef: null
  }

  onSearch = debounce(
    () => {
      const term = this.searchInput.value
      this.props.searchAnnouncements({term})
    },
    SEARCH_TIME_DELAY,
    {
      leading: false,
      trailing: true
    }
  )

  onDelete = () => {
    showConfirmDelete({
      modalRef: modal => {
        this.deleteModal = modal
      },
      selectedCount: this.props.selectedCount,
      onConfirm: () => this.props.deleteSelectedAnnouncements(),
      onHide: () => {
        const {deleteBtn, searchInput} = this
        if (deleteBtn && deleteBtn._button && !deleteBtn._button.disabled) {
          deleteBtn.focus()
        } else if (searchInput) {
          searchInput.focus()
        }
      }
    })
  }

  searchInputRef = input => {
    this.searchInput = input
    if (this.props.searchInputRef) this.props.searchInputRef(input)
  }

  render() {
    return (
      <View>
        <View margin="0 0 medium" display="block">
          <Grid>
            <Grid.Row hAlign="space-between">
              <Grid.Col width={2}>
                <FormField
                  id="announcement-filter"
                  label={<ScreenReaderContent>{I18n.t('Announcement Filter')}</ScreenReaderContent>}
                >
                  <select
                    name="filter-dropdown"
                    onChange={e => this.props.searchAnnouncements({filter: e.target.value})}
                    style={{
                      margin: '0',
                      width: '100%'
                    }}
                  >
                    {Object.keys(filters).map(filter => (
                      <option key={filter} value={filter}>
                        {filters[filter]}
                      </option>
                    ))}
                  </select>
                </FormField>
              </Grid.Col>
              <Grid.Col width={4}>
                <TextInput
                  label={
                    <ScreenReaderContent>
                      {I18n.t('Search announcements by title')}
                    </ScreenReaderContent>
                  }
                  placeholder={I18n.t('Search')}
                  icon={() => <IconSearchLine />}
                  ref={this.searchInputRef}
                  onChange={this.onSearch}
                  name="announcements_search"
                />
              </Grid.Col>
              <Grid.Col width={6} textAlign="end">
                {this.props.permissions.manage_content &&
                  !this.props.announcementsLocked &&
                  (this.props.isToggleLocking ? (
                    <Button
                      disabled={this.props.isBusy || this.props.selectedCount === 0}
                      size="medium"
                      margin="0 small 0 0"
                      id="lock_announcements"
                      onClick={this.props.toggleSelectedAnnouncementsLock}
                    >
                      <IconLockLine />
                      <ScreenReaderContent>
                        {I18n.t('Lock Selected Announcements')}
                      </ScreenReaderContent>
                    </Button>
                  ) : (
                    <Button
                      disabled={this.props.isBusy || this.props.selectedCount === 0}
                      size="medium"
                      margin="0 small 0 0"
                      id="lock_announcements"
                      onClick={this.props.toggleSelectedAnnouncementsLock}
                    >
                      <IconUnlockLine />
                      <ScreenReaderContent>
                        {I18n.t('Unlock Selected Announcements')}
                      </ScreenReaderContent>
                    </Button>
                  ))}
                {this.props.permissions.manage_content && (
                  <Button
                    disabled={this.props.isBusy || this.props.selectedCount === 0}
                    size="medium"
                    margin="0 small 0 0"
                    id="delete_announcements"
                    onClick={this.onDelete}
                    ref={c => {
                      this.deleteBtn = c
                    }}
                  >
                    <IconTrashLine />
                    <ScreenReaderContent>
                      {I18n.t('Delete Selected Announcements')}
                    </ScreenReaderContent>
                  </Button>
                )}
                {this.props.permissions.create && (
                  <Button
                    href={`/${this.props.contextType}s/${this.props.contextId}/discussion_topics/new?is_announcement=true`}
                    variant="primary"
                    id="add_announcement"
                  >
                    <IconPlusLine />
                    <ScreenReaderContent>{I18n.t('Add announcement')}</ScreenReaderContent>
                    <PresentationContent>{I18n.t('Announcement')}</PresentationContent>
                  </Button>
                )}
              </Grid.Col>
            </Grid.Row>
          </Grid>
        </View>
        <ExternalFeedsTray
          atomFeedUrl={this.props.atomFeedUrl}
          permissions={this.props.permissions}
        />
      </View>
    )
  }
}

const connectState = state =>
  Object.assign(
    {
      isBusy: state.isLockingAnnouncements || state.isDeletingAnnouncements,
      selectedCount: state.selectedAnnouncements.length,
      isToggleLocking: state.isToggleLocking
    },
    select(state, ['contextType', 'contextId', 'permissions', 'atomFeedUrl', 'announcementsLocked'])
  )
const selectedActions = [
  'searchAnnouncements',
  'toggleSelectedAnnouncementsLock',
  'deleteSelectedAnnouncements'
]
const connectActions = dispatch => bindActionCreators(select(actions, selectedActions), dispatch)
export const ConnectedIndexHeader = connect(
  connectState,
  connectActions
)(IndexHeader)
