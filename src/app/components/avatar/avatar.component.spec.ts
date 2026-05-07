import { AvatarComponent } from './avatar.component';
import { AuthService } from '@services/auth-service';

describe('AvatarComponent', () => {
  it('should initialize with guest user when no auth user is present', () => {
    const authServiceMock = {
      getUser: jasmine.createSpy().and.returnValue(undefined),
      logout: jasmine.createSpy(),
    } as unknown as AuthService;

    const component = new AvatarComponent(authServiceMock);

    expect(component.userName).toBe('Guest');
    expect(component.isAdmin).toBeFalse();
  });

  it('should initialize username and admin flag from auth user', () => {
    const authServiceMock = {
      getUser: jasmine.createSpy().and.returnValue({
        username: 'admin-user',
        roles: ['USER', 'ADMIN'],
      }),
      logout: jasmine.createSpy(),
    } as unknown as AuthService;

    const component = new AvatarComponent(authServiceMock);

    expect(component.userName).toBe('admin-user');
    expect(component.isAdmin).toBeTrue();
  });

  it('should call console.log in log method', () => {
    const authServiceMock = {
      getUser: jasmine.createSpy().and.returnValue(undefined),
      logout: jasmine.createSpy(),
    } as unknown as AuthService;

    const component = new AvatarComponent(authServiceMock);
    spyOn(console, 'log');

    component.log('test-message');

    expect(console.log).toHaveBeenCalledWith('test-message');
  });

  it('should create component instance', () => {
    const authServiceMock = {
      getUser: jasmine.createSpy().and.returnValue(undefined),
      logout: jasmine.createSpy(),
    } as unknown as AuthService;

    const component = new AvatarComponent(authServiceMock);

    expect(component).toBeTruthy();
  });
});
