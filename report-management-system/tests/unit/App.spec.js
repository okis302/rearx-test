// report-management-system/tests/unit/App.spec.js
import { shallowMount } from '@vue/test-utils';
import App from '@/App.vue'; // Assuming App.vue is at src/App.vue
import axios from 'axios';

// Mock axios
jest.mock('axios');

// Mock the router
const mockRouterPush = jest.fn();

// Global mock for $route. This will be used by the component instance.
// We can modify its properties (params, name) within tests if needed.
let mockRoute = {
  params: {},
  name: 'TestRoute',
  path: '/somepath' // Add path for created hook logic if it uses it
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


describe('App.vue - Report Management', () => {
  let wrapper;
  const mockReportsData = [
    { id: 1, title: 'Report 1', content: 'Content 1' },
    { id: 2, title: 'Report 2', content: 'Content 2' }
  ];

  beforeEach(() => {
    // Reset mocks and localStorage before each test
    axios.get.mockReset();
    axios.post.mockReset();
    axios.put.mockReset();
    axios.delete.mockReset();
    mockRouterPush.mockClear();
    window.localStorage.clear(); // This calls the jest.fn() clear

    // Reset our shared mockRoute object for each test
    mockRoute = {
      params: {},
      name: 'TestRoute',
      path: '/somepath'
    };

    // Default localStorage to authenticated for report management tests
    window.localStorage.setItem('isAuthenticated', 'true');
    window.localStorage.setItem('currentUser', 'testadmin');


    wrapper = shallowMount(App, {
      global: {
        mocks: {
          $router: { push: mockRouterPush }, // Only mock push or other used methods
          $route: mockRoute // Use the mutable mockRoute object
        },
        stubs: {
          'router-view': true,
          'router-link': { template: '<a><slot /></a>' } // Stub router-link to avoid warnings/issues
        }
      }
    });
    // After mounting, App's created hook runs. We might need to ensure
    // isAuthenticated and currentUser in the VM are also set if the created hook
    // doesn't perfectly set them up from the mock localStorage in testing environment
    // or if tests need to override.
    // Forcing them here ensures a consistent state for tests focusing on methods.
    wrapper.vm.isAuthenticated = true;
    wrapper.vm.currentUser = 'testadmin';
  });

  it('fetches reports if authenticated', async () => {
    axios.get.mockResolvedValue({ data: mockReportsData });
    // Set isAuthenticated to true if not already by default setup
    // wrapper.vm.isAuthenticated = true; // Ensured by beforeEach
    await wrapper.vm.fetchReports();

    expect(axios.get).toHaveBeenCalledWith('http://localhost:3001/reports');
    expect(wrapper.vm.reports).toEqual(mockReportsData);
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it('does not fetch reports if not authenticated', async () => {
    wrapper.vm.isAuthenticated = false; // Override for this test
    window.localStorage.setItem('isAuthenticated', 'false'); // Ensure localStorage reflects this too

    await wrapper.vm.fetchReports();

    expect(axios.get).not.toHaveBeenCalled();
    expect(wrapper.vm.reports).toEqual([]); // Should remain empty or be cleared
  });


  it('handles error when fetching reports', async () => {
    axios.get.mockRejectedValue(new Error('Network Error'));
    await wrapper.vm.fetchReports();

    expect(wrapper.vm.error).toContain('Failed to load reports');
    expect(wrapper.vm.reports).toEqual([]);
    expect(wrapper.vm.isLoading).toBe(false);
  });

  it('getReportById returns the correct report', async () => {
    await wrapper.setData({ reports: mockReportsData });
    const report = wrapper.vm.getReportById(1);
    expect(report).toEqual(mockReportsData[0]);
    const notFoundReport = wrapper.vm.getReportById(3);
    expect(notFoundReport).toBeUndefined();
  });

  describe('handleSaveReport', () => {
    it('creates a new report (POST request)', async () => {
      const newReportPayload = { title: 'New Report', content: 'New Content' }; // No ID
      const newReportFromApi = { ...newReportPayload, id: 3 };
      axios.post.mockResolvedValue({ data: newReportFromApi });

      await wrapper.setData({ reports: [...mockReportsData] }); // Initial state
      await wrapper.vm.handleSaveReport(newReportPayload);

      expect(axios.post).toHaveBeenCalledWith('http://localhost:3001/reports', newReportPayload);
      expect(wrapper.vm.reports).toContainEqual(newReportFromApi);
      expect(wrapper.vm.reports.length).toBe(mockReportsData.length + 1);
      expect(mockRouterPush).toHaveBeenCalledWith('/');
    });

    it('updates an existing report (PUT request)', async () => {
      const existingReport = mockReportsData[0];
      const updatedReportPayload = { ...existingReport, title: 'Updated Title' };
      axios.put.mockResolvedValue({ data: updatedReportPayload });

      await wrapper.setData({ reports: [...mockReportsData] });
      await wrapper.vm.handleSaveReport(updatedReportPayload);

      expect(axios.put).toHaveBeenCalledWith(`http://localhost:3001/reports/${existingReport.id}`, updatedReportPayload);
      const reportInVm = wrapper.vm.reports.find(r => r.id === existingReport.id);
      expect(reportInVm.title).toBe('Updated Title');
      expect(mockRouterPush).toHaveBeenCalledWith('/');
    });

    it('redirects to login if trying to save when not authenticated', async () => {
        wrapper.vm.isAuthenticated = false;
        window.localStorage.setItem('isAuthenticated', 'false');
        const newReportPayload = { title: 'New Report', content: 'New Content' };

        await wrapper.vm.handleSaveReport(newReportPayload);

        expect(axios.post).not.toHaveBeenCalled();
        expect(axios.put).not.toHaveBeenCalled();
        expect(wrapper.vm.error).toBe('You must be logged in to save reports.');
        expect(mockRouterPush).toHaveBeenCalledWith('/login');
    });
  });

  describe('handleDeleteReport', () => {
    it('deletes a report and removes it from local data', async () => {
      const reportToDelete = mockReportsData[0];
      axios.delete.mockResolvedValue({});

      await wrapper.setData({ reports: [...mockReportsData] });
      await wrapper.vm.handleDeleteReport(reportToDelete.id);

      expect(axios.delete).toHaveBeenCalledWith(`http://localhost:3001/reports/${reportToDelete.id}`);
      expect(wrapper.vm.reports.find(r => r.id === reportToDelete.id)).toBeUndefined();
      expect(wrapper.vm.reports.length).toBe(mockReportsData.length - 1);
    });

    it('navigates to home if the deleted report was being viewed/edited', async () => {
      const reportToDelete = mockReportsData[0];
      axios.delete.mockResolvedValue({});

      // Simulate being on the deleted report's page by setting $route.params.id
      mockRoute.params.id = reportToDelete.id;

      await wrapper.setData({ reports: [...mockReportsData] });
      await wrapper.vm.handleDeleteReport(reportToDelete.id);

      expect(mockRouterPush).toHaveBeenCalledWith('/');

      // Clean up for other tests
      mockRoute.params.id = undefined;
    });

    it('redirects to login if trying to delete when not authenticated', async () => {
        wrapper.vm.isAuthenticated = false;
        window.localStorage.setItem('isAuthenticated', 'false');
        const reportToDelete = mockReportsData[0];

        await wrapper.vm.handleDeleteReport(reportToDelete.id);

        expect(axios.delete).not.toHaveBeenCalled();
        expect(wrapper.vm.error).toBe('You must be logged in to delete reports.');
        expect(mockRouterPush).toHaveBeenCalledWith('/login');
    });
  });
});
