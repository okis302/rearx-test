// report-management-system/tests/unit/App.spec.js
import { shallowMount } from '@vue/test-utils';
import App from '@/App.vue';
import axios from 'axios';

jest.mock('axios');

const mockRouterPush = jest.fn();
let mockRoute = {
  params: {},
  name: 'SomeRoute',
  path: '/somepath'
};

// This should match the one in App.vue. For testing, we define it here.
// In a real app, this might be imported from a shared config if App.vue also imports it.
const REPORTS_API_URL = 'https://REPLACE_ME_your-api-id.execute-api.your-region.amazonaws.com/your-stage/reports';
// USERS_API_URL is not being tested in this update pass, but would be similar if needed.

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => store[key] = value.toString()),
    removeItem: jest.fn(key => delete store[key]),
    clear: jest.fn(() => store = {})
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });


describe('App.vue - Report Management with AWS API Backend', () => {
  let wrapper;
  // Lambdas output 'reportId'. App.vue's local 'reports' array will store this structure.
  const mockReport1 = { reportId: 'uuid-1', title: 'Report 1 API', content: 'Content 1 API', ownerCognitoSub: 'sub-admin', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const mockReport2 = { reportId: 'uuid-2', title: 'Report 2 API', content: 'Content 2 API', ownerCognitoSub: 'sub-user', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const mockApiReportsData = [mockReport1, mockReport2];

  const adminCognitoUser = { id: 'sub-admin', username: 'admin', role: 'administrator' };
  const generalCognitoUser = { id: 'sub-user', username: 'user', role: 'general' };


  const mountApp = (currentUser = null, routeName = 'TestRoute', routeParams = {}, routePath = '/testpath') => {
    mockRoute.name = routeName;
    mockRoute.params = routeParams;
    mockRoute.path = routePath;

    const appWrapper = shallowMount(App, {
      global: {
        mocks: {
          $router: { push: mockRouterPush },
          $route: mockRoute
        },
        stubs: {
            'router-view': true,
            'router-link': { template: '<a><slot/></a>' }
        }
      }
    });
    if (currentUser) {
      appWrapper.vm.isAuthenticated = true;
      appWrapper.vm.currentUserInfo = currentUser; // App.vue uses currentUserInfo for Amplify user
      window.localStorage.setItem('isAuthenticated', 'true');
      window.localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      appWrapper.vm.isAuthenticated = false;
      appWrapper.vm.currentUserInfo = null;
      window.localStorage.removeItem('isAuthenticated');
      window.localStorage.removeItem('currentUser');
    }
    return appWrapper;
  };

  beforeEach(() => {
    axios.get.mockReset();
    axios.post.mockReset();
    axios.put.mockReset();
    axios.delete.mockReset();
    mockRouterPush.mockClear();
    window.localStorage.clear();
  });

  // Test for handleLoginAttempt should verify role is set (from previous spec, ensure it's still valid)
  describe('handleLoginAttempt with Roles (confirming structure for other tests)', () => {
    it('sets currentUserInfo with role on successful login via Amplify (conceptual)', async () => {
      // This test is conceptual as actual login is via Amplify.
      // We assume App.vue's Hub listener for 'signIn' calls setCurrentUserInfo.
      // setCurrentUserInfo populates this.currentUserInfo from CognitoUser object.
      wrapper = mountApp(); // Start unauthenticated
      const cognitoUserMock = {
        attributes: { sub: 'cognito-sub-admin', email: 'admin@example.com', 'custom:role': 'administrator' },
        username: 'admin-cognito'
      };
      wrapper.vm.setCurrentUserInfo(cognitoUserMock); // Simulate Hub event calling this

      expect(wrapper.vm.currentUserInfo).toEqual({
        id: 'cognito-sub-admin',
        username: 'admin-cognito',
        email: 'admin@example.com',
        role: 'administrator'
      });
    });
  });


  describe('fetchReports (API)', () => {
    it('fetches reports successfully from API Gateway', async () => {
      wrapper = mountApp(adminCognitoUser);
      axios.get.mockResolvedValue({ data: mockApiReportsData });

      await wrapper.vm.fetchReports();

      expect(axios.get).toHaveBeenCalledWith(REPORTS_API_URL);
      expect(wrapper.vm.reports).toEqual(mockApiReportsData);
      expect(wrapper.vm.isLoading).toBe(false);
      expect(wrapper.vm.error).toBeNull();
    });

    it('handles error when fetching reports from API Gateway', async () => {
      wrapper = mountApp(adminCognitoUser);
      axios.get.mockRejectedValue({
        response: { data: { message: 'Internal Server Error' }, status: 500 }
      });

      await wrapper.vm.fetchReports();

      expect(wrapper.vm.error).toContain('Failed to load reports: Internal Server Error');
      expect(wrapper.vm.reports).toEqual([]);
    });
  });

  describe('handleSaveReport - Create (API)', () => {
    const newReportPayload = { title: 'New API Report', content: 'Fresh Content' };
    // Lambda returns the full object including generated reportId, owner, timestamps.
    const createdReportFromApi = { ...newReportPayload, reportId: 'uuid-new', ownerCognitoSub: adminCognitoUser.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

    it('administrator creates a new report via API Gateway', async () => {
      wrapper = mountApp(adminCognitoUser);
      axios.post.mockResolvedValue({ status: 201, data: createdReportFromApi });

      // App.vue's handleSaveReport is called with {title, content} (no id for new)
      await wrapper.vm.handleSaveReport(newReportPayload);

      expect(axios.post).toHaveBeenCalledWith(REPORTS_API_URL, newReportPayload);
      expect(wrapper.vm.reports).toContainEqual(createdReportFromApi);
      expect(mockRouterPush).toHaveBeenCalledWith('/'); // Navigates to home/list
      expect(wrapper.vm.error).toBeNull();
    });

    it('general user is prevented from creating (API not called)', async () => {
      wrapper = mountApp(generalCognitoUser);
      await wrapper.vm.handleSaveReport(newReportPayload);
      expect(axios.post).not.toHaveBeenCalled();
      expect(wrapper.vm.error).toBe('Permission denied. Only administrators can save reports.');
    });
  });

  describe('handleSaveReport - Update (API)', () => {
    const reportToUpdate = mockReport1; // { reportId: 'uuid-1', ... }
    const updatePayload = { title: 'Updated Title API', content: 'Updated Content API' }; // Sent to API
    const updatedReportFromApi = { ...reportToUpdate, ...updatePayload, updatedAt: new Date().toISOString() };

    it('administrator updates an existing report via API Gateway', async () => {
      wrapper = mountApp(adminCognitoUser);
      await wrapper.setData({reports: [...mockApiReportsData]}); // Set initial reports state
      axios.put.mockResolvedValue({ status: 200, data: updatedReportFromApi });

      // handleSaveReport is called with { id (which is reportId), title, content }
      await wrapper.vm.handleSaveReport({ id: reportToUpdate.reportId, ...updatePayload });

      expect(axios.put).toHaveBeenCalledWith(`${REPORTS_API_URL}/${reportToUpdate.reportId}`, updatePayload);
      const updatedReportInVm = wrapper.vm.reports.find(r => r.reportId === reportToUpdate.reportId);
      expect(updatedReportInVm.title).toBe(updatePayload.title);
      expect(mockRouterPush).toHaveBeenCalledWith('/');
    });

    it('handles 403 (Forbidden) from API when admin tries to update (e.g., ownership check failed in Lambda)', async () => {
      wrapper = mountApp(adminCognitoUser);
      await wrapper.setData({reports: [...mockApiReportsData]});
      axios.put.mockRejectedValue({
          response: { status: 403, data: { message: "User is not the owner or admin." } }
      });

      await wrapper.vm.handleSaveReport({ id: reportToUpdate.reportId, ...updatePayload });
      expect(wrapper.vm.error).toContain("Failed to save report: User is not the owner or admin.");
    });
  });

  describe('handleDeleteReport (API)', () => {
    const reportToDelete = mockReport1; // { reportId: 'uuid-1', ... }

    it('administrator deletes a report via API Gateway', async () => {
      wrapper = mountApp(adminCognitoUser);
      await wrapper.setData({reports: [...mockApiReportsData]});
      axios.delete.mockResolvedValue({ status: 204 });

      await wrapper.vm.handleDeleteReport(reportToDelete.reportId);

      expect(axios.delete).toHaveBeenCalledWith(`${REPORTS_API_URL}/${reportToDelete.reportId}`);
      expect(wrapper.vm.reports.find(r => r.reportId === reportToDelete.reportId)).toBeUndefined();
      expect(wrapper.vm.error).toBeNull();
    });

    it('handles 403 (Forbidden) from API when admin tries to delete (e.g., ownership check failed)', async () => {
      wrapper = mountApp(adminCognitoUser);
      await wrapper.setData({reports: [...mockApiReportsData]});
      axios.delete.mockRejectedValue({
          response: { status: 403, data: { message: "User is not the owner or admin for delete." } }
      });
      await wrapper.vm.handleDeleteReport(reportToDelete.reportId);
      expect(wrapper.vm.error).toContain("Failed to delete report: User is not the owner or admin for delete.");
    });
  });

  // Ensure User Management tests are in a separate describe block or file if they grew large
  // For now, this file focuses on Report Management with AWS API
});
