import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  X,
  HelpCircle,
  ExternalLink,
  Paperclip,
  MessageSquarePlus,
  Tag
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import CategoryBadge, { categoryConfig } from "@/components/shared/CategoryBadge";

export default function QnAPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialSearch = urlParams.get("q") || "";
  const initialCategory = urlParams.get("category") || "all";
  const highlightId = urlParams.get("id");

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedTag, setSelectedTag] = useState("all");
  const [openItem, setOpenItem] = useState(highlightId || null);

  const { data: qnas = [], isLoading } = useQuery({
    queryKey: ["qna-list"],
    queryFn: async () => {
      const data = await base44.entities.QnA.filter({ is_published: true }, "-view_count");
      return data;
    },
  });

  // Update view count when item is opened
  const handleItemOpen = async (id) => {
    if (id && id !== openItem) {
      setOpenItem(id);
      const qna = qnas.find(q => q.id === id);
      if (qna) {
        await base44.entities.QnA.update(id, { view_count: (qna.view_count || 0) + 1 });
      }
    }
  };

  // Get all unique tags
  const allTags = [...new Set(qnas.flatMap(q => q.tags || []))].filter(Boolean);

  // Filter Q&As
  const filteredQnAs = qnas.filter(qna => {
    const matchesSearch = !searchQuery || 
      qna.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      qna.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (qna.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || qna.category === selectedCategory;
    const matchesTag = selectedTag === "all" || (qna.tags || []).includes(selectedTag);
    
    return matchesSearch && matchesCategory && matchesTag;
  });

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedTag("all");
  };

  const hasFilters = searchQuery || selectedCategory !== "all" || selectedTag !== "all";

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-4">
          <HelpCircle className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">שאלות ותשובות</h1>
        <p className="text-slate-600">מצאו תשובות לשאלות נפוצות בקורס</p>
      </div>

      {/* Search and Filters */}
      <Card className="border-slate-200">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="חיפוש בשאלות ותשובות..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-12 rounded-xl border-slate-200"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48 h-12 rounded-xl border-slate-200">
                <Filter className="w-4 h-4 ml-2 text-slate-400" />
                <SelectValue placeholder="קטגוריה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקטגוריות</SelectItem>
                {Object.entries(categoryConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {allTags.length > 0 && (
              <Select value={selectedTag} onValueChange={setSelectedTag}>
                <SelectTrigger className="w-full md:w-40 h-12 rounded-xl border-slate-200">
                  <Tag className="w-4 h-4 ml-2 text-slate-400" />
                  <SelectValue placeholder="תגית" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התגיות</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {hasFilters && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-slate-500">מסננים פעילים:</span>
              {searchQuery && (
                <Badge variant="secondary" className="gap-1">
                  חיפוש: {searchQuery}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSearchQuery("")} />
                </Badge>
              )}
              {selectedCategory !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {categoryConfig[selectedCategory]?.label}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedCategory("all")} />
                </Badge>
              )}
              {selectedTag !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {selectedTag}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSelectedTag("all")} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-600 hover:text-red-700">
                נקה הכל
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-slate-600">
          {isLoading ? "טוען..." : `נמצאו ${filteredQnAs.length} תוצאות`}
        </p>
      </div>

      {/* Q&A List */}
      {!isLoading && filteredQnAs.length > 0 ? (
        <Accordion 
          type="single" 
          collapsible 
          value={openItem}
          onValueChange={handleItemOpen}
          className="space-y-4"
        >
          {filteredQnAs.map((qna) => (
            <AccordionItem 
              key={qna.id} 
              value={qna.id}
              className={`bg-white rounded-xl border ${openItem === qna.id ? 'border-blue-200 shadow-lg shadow-blue-500/5' : 'border-slate-200'} overflow-hidden transition-all duration-200`}
            >
              <AccordionTrigger className="px-6 py-5 hover:no-underline hover:bg-slate-50/50 [&[data-state=open]]:bg-blue-50/50">
                <div className="flex-1 text-right">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <HelpCircle className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-right leading-relaxed">
                        {qna.question}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <CategoryBadge category={qna.category} size="sm" showIcon={false} />
                        {qna.tags?.slice(0, 2).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="mr-11 pt-4 border-t">
                  <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {qna.answer}
                  </div>
                  
                  {qna.attachment_url && (
                    <a 
                      href={qna.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <Paperclip className="w-4 h-4" />
                      קובץ/קישור מצורף
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  
                  <p className="text-xs text-slate-400 mt-4">
                    עודכן לאחרונה: {new Date(qna.updated_date).toLocaleDateString('he-IL')}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : !isLoading ? (
        <Card className="border-dashed border-2 border-slate-200">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">לא נמצאו תוצאות</h3>
            <p className="text-slate-500 mb-6">
              לא מצאנו תשובה לשאלה שלך. אולי כדאי לפתוח פנייה?
            </p>
            <Link to={createPageUrl("NewTicket") + (searchQuery ? `?subject=${encodeURIComponent(searchQuery)}` : "")}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <MessageSquarePlus className="w-4 h-4 ml-2" />
                פתיחת פנייה חדשה
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-slate-100 rounded w-1/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Can't Find Answer Banner */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <MessageSquarePlus className="w-6 h-6 text-amber-600" />
            </div>
            <div className="flex-1 text-center sm:text-right">
              <h3 className="font-semibold text-slate-900">לא מצאתם את מה שחיפשתם?</h3>
              <p className="text-sm text-slate-600">פתחו פנייה וצוות הקורס יענה לכם בהקדם</p>
            </div>
            <Link to={createPageUrl("NewTicket") + (searchQuery ? `?subject=${encodeURIComponent(searchQuery)}` : "")}>
              <Button variant="outline" className="border-amber-300 hover:bg-amber-100">
                פתיחת פנייה
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}