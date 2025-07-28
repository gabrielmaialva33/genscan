import { ReactNode, useState } from 'react'
import { Header } from '~/shared/components/layout/header'
import { Sidebar } from '~/shared/components/layout/sidebar'
import { cn } from '~/shared/utils/cn'
import { useIsMobile } from '~/shared/hooks/use_mobile'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen)
    } else {
      setSidebarCollapsed(!sidebarCollapsed)
    }
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onToggleSidebar={toggleSidebar} isMobile={isMobile} />

      <Sidebar
        isOpen={isMobile ? sidebarOpen : true}
        onClose={closeSidebar}
        isCollapsed={!isMobile && sidebarCollapsed}
      />

      <main
        className={cn(
          'min-h-[calc(100vh-4rem)] pt-16 transition-all duration-300',
          !isMobile && (sidebarCollapsed ? 'lg:pl-[80px]' : 'lg:pl-[260px]')
        )}
      >
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
