// report-management-system/tests/unit/ReportList.spec.js
import { shallowMount } from '@vue/test-utils';
import ReportList from '@/components/ReportList.vue';

const mockRouter = {
  push: jest.fn()
};

const mockReports = [
  { id: 1, title: 'Report Alpha', content: 'Content Alpha' },
  { id: 2, title: 'Report Beta', content: 'Content Beta' }
];

const adminUser = { username: 'admin', role: 'administrator' };
const generalUser = { username: 'user', role: 'general' };

describe('ReportList.vue - With Roles', () => {
  let wrapper;

  const mountComponent = (propsData) => {
    return shallowMount(ReportList, {
      props: propsData, // Props will include reports and currentUser
      global: {
        mocks: {
          $router: mockRouter
        }
      }
    });
  };

  beforeEach(() => {
    mockRouter.push.mockClear();
    // Ensure window.confirm is a mock for each test that might use it
    window.confirm = jest.fn();
  });

  describe('Rendering based on User Role', () => {
    it('renders management buttons for administrator user', () => {
      wrapper = mountComponent({ reports: mockReports, currentUser: adminUser });

      expect(wrapper.find('button.create-btn').exists()).toBe(true);
      const firstReportItemDiv = wrapper.findAll('li').at(0).find('div'); // Buttons are inside a div
      const firstReportItemButtons = firstReportItemDiv.findAll('button');

      expect(firstReportItemButtons.length).toBe(3);
      expect(firstReportItemButtons.at(0).text()).toBe('View');
      expect(firstReportItemButtons.at(1).text()).toBe('Edit');
      expect(firstReportItemButtons.at(2).text()).toBe('Delete');
    });

    it('hides management buttons for general user', () => {
      wrapper = mountComponent({ reports: mockReports, currentUser: generalUser });

      expect(wrapper.find('button.create-btn').exists()).toBe(false);
      const firstReportItemDiv = wrapper.findAll('li').at(0).find('div');
      const firstReportItemButtons = firstReportItemDiv.findAll('button');

      expect(firstReportItemButtons.length).toBe(1);
      expect(firstReportItemButtons.at(0).text()).toBe('View');
    });

    it('shows "Create one!" text for no reports only for admin user', () => {
        wrapper = mountComponent({ reports: [], currentUser: adminUser });
        expect(wrapper.find('p').text()).toContain('No reports available. Create one!');

        wrapper = mountComponent({ reports: [], currentUser: generalUser });
        expect(wrapper.find('p').text()).toContain('No reports available.');
        expect(wrapper.find('p').text()).not.toContain('Create one!');
    });
  });

  describe('Actions (confirming behavior with roles)', () => {
    it('allows admin to navigateToCreate', async () => {
      wrapper = mountComponent({ reports: mockReports, currentUser: adminUser });
      await wrapper.find('button.create-btn').trigger('click');
      expect(mockRouter.push).toHaveBeenCalledWith({ name: 'ReportCreate' });
    });

    it('allows admin to navigateToEdit', async () => {
      wrapper = mountComponent({ reports: mockReports, currentUser: adminUser });
      await wrapper.findAll('li').at(0).findAll('button').at(1).trigger('click'); // Edit button
      expect(mockRouter.push).toHaveBeenCalledWith({ name: 'ReportEdit', params: { id: mockReports[0].id } });
    });

    it('allows admin to emit delete-report', async () => {
      window.confirm.mockReturnValue(true);
      wrapper = mountComponent({ reports: mockReports, currentUser: adminUser });
      await wrapper.findAll('li').at(0).findAll('button').at(2).trigger('click'); // Delete button
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this report?');
      expect(wrapper.emitted('delete-report')).toBeTruthy();
      expect(wrapper.emitted('delete-report')[0]).toEqual([mockReports[0].id]);
    });

    it('does not emit "delete-report" for admin if confirmation is cancelled', async () => {
      window.confirm.mockReturnValue(false);
      wrapper = mountComponent({ reports: mockReports, currentUser: adminUser });
      await wrapper.findAll('li').at(0).findAll('button').at(2).trigger('click'); // Delete button
      expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this report?');
      expect(wrapper.emitted('delete-report')).toBeFalsy();
    });

    it('defensive check: navigateToEdit does nothing if called by general user (e.g. programmatically)', () => {
        wrapper = mountComponent({ reports: mockReports, currentUser: generalUser });
        wrapper.vm.navigateToEdit(mockReports[0].id);
        expect(mockRouter.push).not.toHaveBeenCalled();
    });
    it('defensive check: navigateToCreate does nothing if called by general user', () => {
        wrapper = mountComponent({ reports: mockReports, currentUser: generalUser });
        wrapper.vm.navigateToCreate();
        expect(mockRouter.push).not.toHaveBeenCalled();
    });
    it('defensive check: confirmDelete does nothing if called by general user', () => {
        window.confirm.mockReturnValue(true); // User confirms, but method guard should prevent emit
        wrapper = mountComponent({ reports: mockReports, currentUser: generalUser });
        wrapper.vm.confirmDelete(mockReports[0].id);
        expect(window.confirm).not.toHaveBeenCalled(); // Method guard should prevent confirm from even being called
        expect(wrapper.emitted('delete-report')).toBeFalsy();
    });

    it('allows general user to navigateToView', async () => {
        wrapper = mountComponent({ reports: mockReports, currentUser: generalUser });
        // General user only has one button per item, which is "View"
        await wrapper.findAll('li').at(0).find('button').trigger('click');
        expect(mockRouter.push).toHaveBeenCalledWith({ name: 'ReportView', params: { id: mockReports[0].id } });
    });
  });
});
