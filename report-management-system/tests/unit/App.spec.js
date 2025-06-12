// report-management-system/tests/unit/App.spec.js
import { shallowMount } from '@vue/test-utils';
import App from '@/App.vue';
import axios from 'axios';

jest.mock('axios');

const mockRouterPush = jest.fn();
let mockRoute = { // Make it let so it can be modified by tests if needed
  params: {},
  name: 'SomeRoute',
  path: '/somepath'
};

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

describe('App.vue - With Roles', () => {
  let wrapper;
  const mockReportsData = [
    { id: 1, title: 'Report 1', content: 'Content 1' },
    { id: 2, title: 'Report 2', content: 'Content 2' }
  ];
  const adminUser = { username: 'admin', role: 'administrator' };
  const generalUser = { username: 'user', role: 'general' };

  const mountApp = (currentUser = null, currentRouteName = 'TestRoute', currentRoutePath = '/testpath') => {
    // Reset mockRoute for each mount to ensure clean state for $route
    mockRoute = { params: {}, name: currentRouteName, path: currentRoutePath };

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
      appWrapper.vm.currentUser = currentUser;
      window.localStorage.setItem('isAuthenticated', 'true');
      window.localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      appWrapper.vm.isAuthenticated = false;
      appWrapper.vm.currentUser = null;
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
    window.localStorage.clear(); // Clears the jest.fn() based store
  });

  describe('handleLoginAttempt with Roles', () => {
    it('sets currentUser with role on successful login', async () => {
      wrapper = mountApp(); // Start unauthenticated
      const mockUserFromApi = { id: 1, username: 'admin', password: 'password', role: 'administrator' };
      axios.get.mockResolvedValue({ data: [mockUserFromApi] });

      await wrapper.vm.handleLoginAttempt({ userId: 'admin', password: 'password' });

      expect(wrapper.vm.isAuthenticated).toBe(true);
      expect(wrapper.vm.currentUser).toEqual({ username: 'admin', role: 'administrator' });
      // Check localStorage through our mock
      expect(window.localStorage.getItem('currentUser')).toEqual(JSON.stringify({ username: 'admin', role: 'administrator' }));
      expect(mockRouterPush).toHaveBeenCalledWith('/');
    });
  });

  describe('handleSaveReport with Roles', () => {
    const newReportPayload = { title: 'New Report', content: 'New Content' };
    const newReportFromApi = { ...newReportPayload, id: 3 };

    it('allows administrator to create a new report', async () => {
      wrapper = mountApp(adminUser);
      axios.post.mockResolvedValue({ data: newReportFromApi });
      await wrapper.vm.handleSaveReport(newReportPayload);
      expect(axios.post).toHaveBeenCalledWith('http://localhost:3001/reports', newReportPayload);
      expect(wrapper.vm.reports).toContainEqual(newReportFromApi);
      expect(wrapper.vm.error).toBeNull(); // No error should be set
    });

    it('prevents general user from creating a new report and sets error', async () => {
      wrapper = mountApp(generalUser);
      await wrapper.vm.handleSaveReport(newReportPayload);
      expect(axios.post).not.toHaveBeenCalled();
      expect(wrapper.vm.reports).not.toContainEqual(newReportFromApi);
      expect(wrapper.vm.error).toBe('You do not have permission to save reports.');
    });

    it('allows administrator to update an existing report', async () => {
      wrapper = mountApp(adminUser);
      const existingReport = mockReportsData[0];
      const updatedReportData = { ...existingReport, title: 'Updated Title By Admin' };
      axios.put.mockResolvedValue({ data: updatedReportData });
      await wrapper.setData({reports: [...mockReportsData]});

      await wrapper.vm.handleSaveReport(updatedReportData);
      expect(axios.put).toHaveBeenCalledWith(`http://localhost:3001/reports/${existingReport.id}`, updatedReportData);
      const reportInVm = wrapper.vm.reports.find(r => r.id === existingReport.id);
      expect(reportInVm.title).toBe('Updated Title By Admin');
      expect(wrapper.vm.error).toBeNull();
    });

    it('prevents general user from updating an existing report and sets error', async () => {
      wrapper = mountApp(generalUser);
      const existingReport = mockReportsData[0];
      const updatedReportData = { ...existingReport, title: 'Updated Title By User' };
      await wrapper.setData({reports: [...mockReportsData]});

      await wrapper.vm.handleSaveReport(updatedReportData);
      expect(axios.put).not.toHaveBeenCalled();
      const reportInVm = wrapper.vm.reports.find(r => r.id === existingReport.id);
      expect(reportInVm.title).toBe(existingReport.title);
      expect(wrapper.vm.error).toBe('You do not have permission to save reports.');
    });
  });

  describe('handleDeleteReport with Roles', () => {
    const reportToDelete = mockReportsData[0];

    it('allows administrator to delete a report', async () => {
      wrapper = mountApp(adminUser);
      axios.delete.mockResolvedValue({});
      await wrapper.setData({reports: [...mockReportsData]});

      await wrapper.vm.handleDeleteReport(reportToDelete.id);
      expect(axios.delete).toHaveBeenCalledWith(`http://localhost:3001/reports/${reportToDelete.id}`);
      expect(wrapper.vm.reports.find(r => r.id === reportToDelete.id)).toBeUndefined();
      expect(wrapper.vm.error).toBeNull();
    });

    it('prevents general user from deleting a report and sets error', async () => {
      wrapper = mountApp(generalUser);
      await wrapper.setData({reports: [...mockReportsData]});

      await wrapper.vm.handleDeleteReport(reportToDelete.id);
      expect(axios.delete).not.toHaveBeenCalled();
      expect(wrapper.vm.reports.find(r => r.id === reportToDelete.id)).toBeDefined();
      expect(wrapper.vm.error).toBe('You do not have permission to delete reports.');
    });
  });

  it('fetches reports (accessible to all authenticated users like general user)', async () => {
    wrapper = mountApp(generalUser, 'ReportList', '/reports'); // Simulate being on ReportList route
    axios.get.mockResolvedValue({ data: mockReportsData });
    // Need to trigger fetchReports, e.g. by simulating created hook or route watch
    // The created hook in App.vue calls fetchReports if path is '/' or name is 'ReportList'
    // Our mountApp helper sets up $route.name, so created hook should trigger fetchReports
    // For this specific test, let's ensure the conditions in `created()` are met by `mountApp`
    // OR call it directly if we assume authentication and route conditions are met.

    // Re-mount or adjust mountApp to ensure created hook logic for fetchReports is covered
    // For this test, let's directly call it after mount, assuming conditions are met.
    await wrapper.vm.fetchReports();

    expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/reports');
    expect(wrapper.vm.reports).toEqual(mockReportsData);
  });
});
