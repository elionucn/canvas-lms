/*
 * Copyright (C) 2019 - present Instructure, Inc.
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

import axios from 'axios'
import {EXTERNAL_TOOLS_QUERY, USER_GROUPS_QUERY} from '../../../graphqlData/Queries'
import {fireEvent, render, waitForElement} from '@testing-library/react'
import {MockedProvider} from '@apollo/react-testing'
import {mockQuery} from '../../../mocks'
import MoreOptions from '../MoreOptions'
import React from 'react'

jest.setTimeout(10000)

async function createGraphqlMocks(overrides = {}) {
  const userGroupOverrides = [{Node: () => ({__typename: 'User'})}]
  userGroupOverrides.push(overrides)

  const externalToolsResult = await mockQuery(EXTERNAL_TOOLS_QUERY, overrides, {courseID: '1'})
  const userGroupsResult = await mockQuery(USER_GROUPS_QUERY, userGroupOverrides, {userID: '1'})
  return [
    {
      request: {
        query: EXTERNAL_TOOLS_QUERY,
        variables: {courseID: '1'}
      },
      result: externalToolsResult
    },
    {
      request: {
        query: EXTERNAL_TOOLS_QUERY,
        variables: {courseID: '1'}
      },
      result: externalToolsResult
    },
    {
      request: {
        query: USER_GROUPS_QUERY,
        variables: {userID: '1'}
      },
      result: userGroupsResult
    }
  ]
}

beforeEach(() => {
  jest.spyOn(axios, 'get').mockImplementation(input => {
    const resp = {headers: {}, data: []}
    if (input === '/api/v1/users/self/folders/root') {
      resp.data = {
        context_type: 'user',
        id: '1',
        name: 'my files',
        created_at: '2019-08-13T16:38:42Z'
      }
    } else if (input === '/api/v1/courses/1/folders/root') {
      resp.data = {
        context_type: 'course',
        id: '2',
        name: 'course files',
        created_at: '2019-08-13T16:38:42Z'
      }
    } else if (input === '/api/v1/groups/1/folders/root') {
      resp.data = {
        context_type: 'group',
        id: '3',
        name: 'group files',
        created_at: '2019-08-13T16:38:42Z'
      }
    } else if (input === '/api/v1/folders/1/folders?include=user') {
      resp.data = {
        id: '4',
        name: 'dank memes',
        created_at: '2019-08-13T16:38:42Z',
        locked: false,
        parent_folder_id: '1'
      }
    } else if (input === '/api/v1/folders/4/files?include=user') {
      resp.data = {
        id: '10',
        display_name: 'bad_luck_brian.png',
        created_at: '2019-05-14T18:14:05Z',
        updated_at: '2019-08-14T22:26:07Z',
        user: {
          display_name: 'Mr. Norton'
        },
        size: 1122994,
        locked: false,
        folder_id: '4'
      }
    } else if (input === '/api/v1/folders/1/files?include=user') {
      resp.data = {
        id: '11',
        display_name: 'www.creedthoughts.gov.www/creedthoughts',
        created_at: '2019-05-14T20:00:00Z',
        updated_at: '2019-08-14T22:00:00Z',
        user: {
          display_name: 'Creed Bratton'
        },
        size: 1122994,
        locked: false,
        folder_id: '1'
      }
    }
    return Promise.resolve(resp)
  })
})

describe('MoreOptions', () => {
  it('renders a button for more options', () => {
    const {getByText} = render(<MoreOptions assignmentID="1" courseID="1" userID="1" />)
    expect(getByText('More Options')).toBeInTheDocument()
  })

  it('renders the more options modal when the button is clicked', async () => {
    const overrides = {
      ExternalToolConnection: () => ({
        nodes: [{}]
      })
    }
    const mocks = await createGraphqlMocks(overrides)
    const {getByTestId} = render(
      <MockedProvider mocks={mocks}>
        <MoreOptions assignmentID="1" courseID="1" userID="1" />
      </MockedProvider>
    )
    const moreOptionsButton = getByTestId('more-options-button')
    fireEvent.click(moreOptionsButton)

    expect(await waitForElement(() => getByTestId('more-options-modal'))).toBeInTheDocument()
  })

  describe('LTI Tools', () => {
    it('renders the external tools in tabs', async () => {
      const overrides = {
        ExternalToolConnection: () => ({
          nodes: [{_id: '1', name: 'Tool 1'}, {_id: '2', name: 'Tool 2'}]
        })
      }
      const mocks = await createGraphqlMocks(overrides)
      const {getByTestId, getAllByRole} = render(
        <MockedProvider mocks={mocks}>
          <MoreOptions assignmentID="1" courseID="1" userID="1" />
        </MockedProvider>
      )
      const moreOptionsButton = getByTestId('more-options-button')
      fireEvent.click(moreOptionsButton)

      const tabs = await waitForElement(() => getAllByRole('tab'))
      expect(tabs[1]).toContainHTML('Tool 1')
      expect(tabs[2]).toContainHTML('Tool 2')
    })

    it('closes the modal when it receives the "LtiDeepLinkingResponse" event', async () => {
      const overrides = {
        ExternalToolConnection: () => ({
          nodes: [{_id: '1', name: 'Tool 1'}, {_id: '2', name: 'Tool 2'}]
        })
      }
      const mocks = await createGraphqlMocks(overrides)
      const {getByTestId, queryByTestId} = render(
        <MockedProvider mocks={mocks}>
          <MoreOptions assignmentID="1" courseID="1" userID="1" />
        </MockedProvider>
      )
      const moreOptionsButton = getByTestId('more-options-button')
      fireEvent.click(moreOptionsButton)

      const modal = await waitForElement(() => getByTestId('more-options-modal'))
      expect(modal).toBeInTheDocument()

      fireEvent(
        window,
        new MessageEvent('message', {data: {messageType: 'LtiDeepLinkingResponse'}})
      )

      expect(queryByTestId('more-options-modal')).not.toBeInTheDocument()
    })
  })

  describe('Canvas Files', () => {
    it('renders the canvas files tab', async () => {
      const overrides = {
        ExternalToolConnection: () => ({
          nodes: [{}]
        })
      }
      const mocks = await createGraphqlMocks(overrides)
      const {getByTestId, getAllByRole} = render(
        <MockedProvider mocks={mocks}>
          <MoreOptions assignmentID="1" courseID="1" userID="1" />
        </MockedProvider>
      )
      const moreOptionsButton = getByTestId('more-options-button')
      fireEvent.click(moreOptionsButton)

      const tabs = await waitForElement(() => getAllByRole('tab'))
      expect(tabs[0]).toContainHTML('Canvas Files')
    })

    it('renders user, group, and course folders', async () => {
      const overrides = {
        ExternalToolConnection: () => ({
          nodes: [{}]
        })
      }
      const mocks = await createGraphqlMocks(overrides)
      const {getAllByText, getByTestId} = render(
        <MockedProvider mocks={mocks}>
          <MoreOptions assignmentID="1" courseID="1" userID="1" />
        </MockedProvider>
      )
      const moreOptionsButton = getByTestId('more-options-button')
      fireEvent.click(moreOptionsButton)

      expect(await waitForElement(() => getAllByText('my files')[0])).toBeInTheDocument()
      expect(await waitForElement(() => getAllByText('course files')[0])).toBeInTheDocument()
      expect(
        await waitForElement(() => getAllByText(mocks[2].result.data.legacyNode.groups[0].name)[0])
      ).toBeInTheDocument()
    })

    it('renders the folder contents when a folder is selected', async () => {
      const overrides = {
        ExternalToolConnection: () => ({
          nodes: [{}]
        })
      }
      const mocks = await createGraphqlMocks(overrides)
      const {getAllByText, getByTestId} = render(
        <MockedProvider mocks={mocks}>
          <MoreOptions assignmentID="1" courseID="1" userID="1" />
        </MockedProvider>
      )
      const moreOptionsButton = getByTestId('more-options-button')
      fireEvent.click(moreOptionsButton)

      const myFilesButton = await waitForElement(() => getAllByText('my files')[0])
      fireEvent.click(myFilesButton)

      const fileSelect = await waitForElement(() => getByTestId('more-options-file-select'))
      expect(fileSelect).toContainElement(await waitForElement(() => getAllByText('dank memes')[0]))
      expect(fileSelect).toContainElement(
        await waitForElement(() => getAllByText('www.creedthoughts.gov.www/creedthoughts')[0])
      )
    })

    it('allows folder navigation through breadcrumbs', async () => {
      const overrides = {
        ExternalToolConnection: () => ({
          nodes: [{}]
        })
      }
      const mocks = await createGraphqlMocks(overrides)
      const {getAllByText, getByTestId} = render(
        <MockedProvider mocks={mocks}>
          <MoreOptions assignmentID="1" courseID="1" userID="1" />
        </MockedProvider>
      )
      const moreOptionsButton = getByTestId('more-options-button')
      fireEvent.click(moreOptionsButton)

      const myFilesButton = await waitForElement(() => getAllByText('my files')[0])
      fireEvent.click(myFilesButton)

      const fileSelect = await waitForElement(() => getByTestId('more-options-file-select'))
      expect(fileSelect).toContainElement(await waitForElement(() => getAllByText('dank memes')[0]))

      const rootFolderBreadcrumbLink = await waitForElement(() => getAllByText('Root')[0])
      fireEvent.click(rootFolderBreadcrumbLink)

      expect(await waitForElement(() => getAllByText('my files')[0])).toBeInTheDocument()
      expect(await waitForElement(() => getAllByText('course files')[0])).toBeInTheDocument()
      expect(
        await waitForElement(() => getAllByText(mocks[2].result.data.legacyNode.groups[0].name)[0])
      ).toBeInTheDocument()
    })
  })
})
